"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  STORE_TYPE_BY_KIND,
  SUGGESTED_PALETTE,
  kindFromStoreType,
  type ShopKind,
} from "@/components/shop-preview/samples";
import { CATALOG_INCLUDED_APP_IDS, OPTIONAL_APP_IDS } from "@/config/apps";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "@/i18n/navigation";
import api from "@/lib/api";
import { setAuthSessionCookie } from "@/lib/auth-session-cookie";
import {
  connectDomain,
  fetchDomains,
  removeDomain,
  verifyDomain,
  type StoreDomain,
  type StoreDomainVerifyResponse,
  storefrontUrlFor,
} from "@/lib/domains/api";
import { normalizeBdMobile } from "@/lib/bd-mobile";
import { isNetworkError } from "@/lib/network-error";
import { fetchSetupGuide, type SetupGuide } from "@/lib/setup-guide";
import { accountsFromApi } from "@/lib/storeSocialLinks";
import { fetchMeForRouting, invalidateMeRoutingCache, setupUnfinished } from "@/lib/subscription-access";
import { fetchPalettes, type ShopPalette } from "@/lib/theme-editor/palettes";
import { clearPendingVerificationEmail } from "@/lib/verification-state";

/**
 * The new shop's setup (owner, 2026-09-28). Five steps, one question each:
 *
 *   sell      what the shop sells           -- the sample shop beside it changes kind
 *   name      its name                      -- and the address it will get; Continue MAKES the shop
 *   address   its free address, or a domain the owner has, connected and checked for real
 *   look      one of the six palettes
 *   contact   phone, the same number on WhatsApp, a Facebook page
 *
 * then "finishing" (the last saves, ticked as they land) and "ready". The shop exists from the
 * name step on, so an owner who leaves is brought back to the address step (auth/me/
 * `store.setup_finished`), and every step after it edits the shop that exists.
 */

export const SETUP_STEPS = ["sell", "name", "address", "look", "contact"] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];
export type SetupPhase = SetupStep | "finishing" | "ready";

/** Custom domains ship dark until the platform can serve them (settingsSections.ts). */
export const DOMAINS_ENABLED = process.env.NEXT_PUBLIC_DOMAINS_ENABLED === "1";

type CreatedStore = {
  public_id: string;
  storefront_url?: string;
  access: string;
  refresh: string;
};

/**
 * The address a typed name would get. `none`: the platform gives new shops no address of their
 * own (the API's empty answer); `failed`: the check could not be made -- each said as it is,
 * never left looking like a wait (owner, 2026-09-28: "make the box honest").
 */
export type NameCheck =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok"; hostname: string }
  | { state: "none" }
  | { state: "failed" }
  | { state: "needs_letters" };

export type DomainCheck = {
  state: "idle" | "checking" | "done";
  result: StoreDomainVerifyResponse | null;
};

export type FinishTick = "contact" | "look" | "address" | "dashboard";

/** The step a `?step=` names, when it names one. */
function stepFrom(value: string | null): SetupStep | null {
  return (SETUP_STEPS as readonly string[]).includes(value ?? "") ? (value as SetupStep) : null;
}

/**
 * What the owner has answered but setup has not saved yet, kept in this tab so a reload does not
 * lose it (2026-09-28): before the shop is made, what it sells and its name; after, the look and
 * how shoppers reach it. Only ever a convenience -- the shop itself is the record -- so a tab
 * that cannot store anything simply starts those answers again.
 */
type Draft = {
  user: string;
  kind?: ShopKind | null;
  shopName?: string;
  ownerFirst?: string;
  ownerLast?: string;
  palette?: string | null;
  phone?: string;
  whatsapp?: boolean;
  facebook?: string;
};

const DRAFT_KEY = "pb_setup_draft_v1";

function readDraft(user: string): Draft | null {
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null") as Draft | null;
    return draft && draft.user === user ? draft : null;
  } catch {
    return null;
  }
}

function writeDraft(draft: Draft | null) {
  try {
    if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage unavailable (private mode) -- the answers just are not kept */
  }
}

function hostnameOf(url: string | undefined | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function errorCode(err: unknown): string | undefined {
  const data =
    err && typeof err === "object" && "response" in err
      ? (err as { response?: { data?: { code?: unknown } } }).response?.data
      : undefined;
  return typeof data?.code === "string" ? data.code : undefined;
}

const MIN_TICK_MS = 650;

function atLeast<T>(work: Promise<T>, ms = MIN_TICK_MS): Promise<T> {
  return Promise.all([work, new Promise((resolve) => setTimeout(resolve, ms))]).then(([value]) => value);
}

export function useSetup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddMode = searchParams.get("add") === "1";
  const { isAuthenticated, isLoading: authLoading, authHydrated, logout } = useAuth();

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState("");
  // The step is the page's address (`?step=look`), so a reload stays on it and the browser's
  // Back goes back a step. "finishing" and "ready" are not steps: they are what Finish shows.
  const urlStep = stepFrom(searchParams.get("step"));
  const [endPhase, setEndPhase] = useState<"finishing" | "ready" | null>(null);
  // Which way the step moved, worked out as the address changes -- by a button or by the
  // browser's own Back and Forward alike -- so the new step slides in from the right side.
  const [shownStep, setShownStep] = useState<SetupStep | null>(urlStep);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  if (urlStep !== shownStep) {
    setShownStep(urlStep);
    if (urlStep && shownStep) {
      setDirection(SETUP_STEPS.indexOf(urlStep) < SETUP_STEPS.indexOf(shownStep) ? "back" : "forward");
    }
  }
  const [error, setError] = useState<"network" | "failed" | null>(null);
  const [busy, setBusy] = useState(false);

  // The owner, from sign-up. Asked on the name step only when sign-up did not have it.
  const [ownerFirst, setOwnerFirst] = useState("");
  const [ownerLast, setOwnerLast] = useState("");
  const [askOwnerName, setAskOwnerName] = useState(false);

  const [kind, setKind] = useState<ShopKind | null>(null);
  const [shopName, setShopName] = useState("");
  const [nameCheck, setNameCheck] = useState<NameCheck>({ state: "idle" });

  // Once made: the shop, what it was made as, and its own address.
  const [storeId, setStoreId] = useState<string | null>(null);
  const [savedName, setSavedName] = useState("");
  const [savedKind, setSavedKind] = useState<ShopKind | null>(null);
  const [storeHostname, setStoreHostname] = useState("");
  const [storeUrl, setStoreUrl] = useState("");

  const [addressMode, setAddressMode] = useState<"free" | "own">("free");
  const [domainInput, setDomainInput] = useState("");
  const [domain, setDomain] = useState<StoreDomain | null>(null);
  const [domainError, setDomainError] = useState(false);
  const [domainCheck, setDomainCheck] = useState<DomainCheck>({ state: "idle", result: null });

  const [palettes, setPalettes] = useState<ShopPalette[]>([]);
  const [palette, setPalette] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState(true);
  const [facebook, setFacebook] = useState("");
  const [contactError, setContactError] = useState<"phone" | "facebook" | null>(null);

  const [ticks, setTicks] = useState<Record<FinishTick, "todo" | "now" | "done">>({
    contact: "todo",
    look: "todo",
    address: "todo",
    dashboard: "todo",
  });
  const [guide, setGuide] = useState<SetupGuide | null>(null);

  // ---- where to start ------------------------------------------------------------------------
  useEffect(() => {
    if (!authHydrated || authLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchMeForRouting();
        if (cancelled) return;
        const draft = readDraft(me.public_id ?? "");
        setUser(me.public_id ?? "");
        setOwnerFirst(draft?.ownerFirst || me.first_name || "");
        setOwnerLast(draft?.ownerLast || me.last_name || "");
        setAskOwnerName(!(me.first_name ?? "").trim() || !(me.last_name ?? "").trim());
        if (draft) {
          setPalette(draft.palette ?? null);
          setPhone(draft.phone ?? "");
          setWhatsapp(draft.whatsapp ?? true);
          setFacebook(draft.facebook ?? "");
          setKind(draft.kind ?? null);
          setShopName(draft.shopName ?? "");
        }
        if (setupUnfinished(me) && me.store) {
          // Made on an earlier visit: what it sells and its name are the shop's own now.
          const madeAs = kindFromStoreType(me.store.store_type);
          setStoreId(me.store.public_id);
          setShopName(me.store.name);
          setSavedName(me.store.name);
          setKind(madeAs);
          setSavedKind(madeAs);
          const { data } = await api.get<{ storefront_url?: string }>("store/");
          if (!cancelled) {
            setStoreHostname(hostnameOf(data.storefront_url));
            setStoreUrl(data.storefront_url ?? "");
          }
        } else if (me.active_store_public_id && !isAddMode) {
          router.replace("/");
          return;
        }
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authHydrated, authLoading, isAuthenticated, isAddMode, router]);

  // The palettes' colours are the API's (theming/presets/), for the preview and the Look step.
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchPalettes(api)
      .then(setPalettes)
      .catch(() => setPalettes([]));
  }, [isAuthenticated]);

  // ---- the address a name would get, while it is typed -----------------------------------------
  useEffect(() => {
    if (storeId) return; // made: its address is its own now
    const name = shopName.trim();
    if (!name) {
      setNameCheck({ state: "idle" });
      return;
    }
    setNameCheck({ state: "checking" });
    const timer = window.setTimeout(() => {
      api
        .get<{ hostname: string }>("store/address-preview/", { params: { name } })
        .then(({ data }) => setNameCheck(data.hostname ? { state: "ok", hostname: data.hostname } : { state: "none" }))
        .catch((err: unknown) =>
          setNameCheck(errorCode(err) === "name_needs_letters" ? { state: "needs_letters" } : { state: "failed" })
        );
    }, 400);
    return () => window.clearTimeout(timer);
  }, [shopName, storeId]);

  /** The step shown: Finish's own screens, else the address's step, else where setup starts. */
  const phase: SetupPhase = endPhase ?? urlStep ?? (storeId ? "address" : "sell");

  const stepHref = useCallback(
    (step: SetupStep) => ({
      pathname: "/onboarding" as const,
      query: { step, ...(isAddMode ? { add: "1" } : {}) },
    }),
    [isAddMode]
  );

  // An address with no step, or one setup cannot be on yet -- a later step before the shop is
  // made, the name before what it sells -- is put right, without adding to the history.
  useEffect(() => {
    if (!ready || endPhase) return;
    const earliest: SetupStep = storeId ? "address" : kind ? "name" : "sell";
    const reachable: readonly SetupStep[] = storeId ? SETUP_STEPS : kind ? ["sell", "name"] : ["sell"];
    if (!urlStep) router.replace(stepHref(storeId ? "address" : "sell"));
    else if (!reachable.includes(urlStep)) router.replace(stepHref(earliest));
  }, [ready, endPhase, urlStep, storeId, kind, router, stepHref]);

  // The answers not saved yet, kept in this tab (Draft).
  useEffect(() => {
    if (!ready || !user || endPhase === "ready") return;
    writeDraft({ user, kind, shopName, ownerFirst, ownerLast, palette, phone, whatsapp, facebook });
  }, [ready, user, endPhase, kind, shopName, ownerFirst, ownerLast, palette, phone, whatsapp, facebook]);

  // ---- a domain made on an earlier visit comes back with its records --------------------------
  useEffect(() => {
    if (phase !== "address" || !storeId || !DOMAINS_ENABLED || domain) return;
    fetchDomains()
      .then((rows) => {
        const own = rows.find((row) => row.kind === "custom");
        if (own) {
          setDomain(own);
          setAddressMode("own");
        }
      })
      .catch(() => undefined);
  }, [phase, storeId, domain]);

  // ---- moving between steps ------------------------------------------------------------------
  const go = useCallback(
    (next: SetupPhase) => {
      setError(null);
      if (next === "finishing" || next === "ready") {
        setEndPhase(next);
        return;
      }
      setEndPhase(null);
      if (next !== urlStep) router.push(stepHref(next));
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    },
    [router, stepHref, urlStep]
  );

  const back = useCallback(() => {
    const i = SETUP_STEPS.indexOf(phase as SetupStep);
    if (i > 0) go(SETUP_STEPS[i - 1]);
  }, [phase, go]);

  /** The Look step starts on the palette suggested for the kind, until the owner picks one. */
  const chosenPalette = palette ?? SUGGESTED_PALETTE[kind ?? "clothing"];

  async function saveBranding(fields: Record<string, unknown>) {
    await api.patch("admin/branding/", fields);
  }

  function fail(err: unknown) {
    setError(isNetworkError(err) ? "network" : "failed");
  }

  const [stepError, setStepError] = useState<"sell" | "name" | "owner" | null>(null);

  async function continueFromSell() {
    if (!kind) {
      setStepError("sell");
      return;
    }
    setStepError(null);
    if (storeId && kind !== savedKind) {
      setBusy(true);
      try {
        await saveBranding({ store_type: STORE_TYPE_BY_KIND[kind] });
        setSavedKind(kind);
      } catch (err) {
        fail(err);
        return;
      } finally {
        setBusy(false);
      }
    }
    go("name");
  }

  async function continueFromName() {
    const name = shopName.trim();
    if (!name) {
      setStepError("name");
      return;
    }
    if (nameCheck.state === "needs_letters") return;
    if (askOwnerName && (!ownerFirst.trim() || !ownerLast.trim())) {
      setStepError("owner");
      return;
    }
    setStepError(null);
    setBusy(true);
    try {
      if (storeId) {
        if (name !== savedName) {
          await saveBranding({ admin_name: name });
          setSavedName(name);
        }
      } else {
        await makeShop(name);
      }
      go("address");
    } catch (err) {
      if (errorCode(err) === "name_needs_letters") setNameCheck({ state: "needs_letters" });
      else fail(err);
    } finally {
      setBusy(false);
    }
  }

  /** The shop is made here, after what it sells and its name (POST /store/). */
  async function makeShop(name: string) {
    const modules_enabled: Record<string, boolean> = {};
    for (const id of CATALOG_INCLUDED_APP_IDS) modules_enabled[id] = true;
    // Every app starts on; Settings turns one off.
    for (const id of OPTIONAL_APP_IDS) modules_enabled[id] = true;
    const { data } = await api.post<CreatedStore>("store/", {
      name,
      store_type: STORE_TYPE_BY_KIND[kind ?? "other"],
      ...(askOwnerName ? { owner_first_name: ownerFirst.trim(), owner_last_name: ownerLast.trim() } : {}),
      modules_enabled,
    });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    setAuthSessionCookie();
    localStorage.setItem("core_enabled_apps", JSON.stringify([...OPTIONAL_APP_IDS]));
    invalidateMeRoutingCache();
    clearPendingVerificationEmail();
    setStoreId(data.public_id);
    setSavedName(name);
    setSavedKind(kind);
    setStoreHostname(hostnameOf(data.storefront_url));
    setStoreUrl(data.storefront_url ?? "");
  }

  // ---- a domain the owner has ----------------------------------------------------------------
  async function connectOwnDomain() {
    const typed = domainInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!typed) return;
    setDomainError(false);
    setBusy(true);
    try {
      setDomain(await connectDomain(typed));
      setDomainCheck({ state: "idle", result: null });
    } catch {
      setDomainError(true);
    } finally {
      setBusy(false);
    }
  }

  async function checkOwnDomain() {
    if (!domain) return;
    setDomainCheck({ state: "checking", result: null });
    try {
      const result = await atLeast(verifyDomain(domain.public_id), 2400);
      setDomain(result.domain);
      setDomainCheck({ state: "done", result });
    } catch (err) {
      // 429: checked a moment ago -- the answer it carries is still the domain's.
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { domain?: StoreDomain } } }).response?.data
          : undefined;
      if (data?.domain) setDomain(data.domain);
      setDomainCheck({ state: "idle", result: null });
    }
  }

  /** Setup made the domain it is giving up, and it never went live: it goes. */
  function pickAnotherDomain() {
    if (domain && domain.status !== "active") void removeDomain(domain.public_id).catch(() => undefined);
    setDomain(null);
    setDomainInput("");
    setDomainCheck({ state: "idle", result: null });
  }

  const domainLive = domain?.status === "active";

  // ---- the last saves --------------------------------------------------------------------------
  async function finish() {
    const mobile = normalizeBdMobile(phone);
    if (!mobile) {
      setContactError("phone");
      return;
    }
    setContactError(null);
    setError(null);
    setTicks({ contact: "now", look: "todo", address: "todo", dashboard: "todo" });
    go("finishing");
    try {
      // How shoppers reach the shop: Identity is the one place it is kept (admin/branding/).
      await atLeast(
        (async () => {
          const { data } = await api.get<{ social_links?: unknown }>("admin/branding/");
          const accounts = accountsFromApi(data.social_links).filter(
            (one) => !(whatsapp && one.platform === "whatsapp") && !(facebook.trim() && one.platform === "facebook")
          );
          if (whatsapp) accounts.unshift({ platform: "whatsapp", account: mobile });
          if (facebook.trim()) accounts.push({ platform: "facebook", account: facebook.trim() });
          await saveBranding({ phone: mobile, social_links: accounts });
        })()
      );
      setTicks((t) => ({ ...t, contact: "done", look: "now" }));
      await atLeast(api.post("store/setup/finish/", { palette: chosenPalette }));
      setTicks((t) => ({ ...t, look: "done", address: "now" }));
      await atLeast(Promise.resolve());
      setTicks((t) => ({ ...t, address: "done", dashboard: "now" }));
      invalidateMeRoutingCache();
      const [nextGuide] = await atLeast(Promise.all([fetchSetupGuide(), fetchMeForRouting()]));
      setGuide(nextGuide);
      setTicks((t) => ({ ...t, dashboard: "done" }));
      writeDraft(null); // all saved: nothing left to keep for a reload
      await new Promise((resolve) => setTimeout(resolve, 450));
      go("ready");
    } catch (err) {
      if (errorCode(err)?.startsWith("social_account")) {
        setContactError("facebook");
        go("contact");
        return;
      }
      fail(err);
    }
  }

  const paletteTokens = useMemo(
    () => palettes.find((one) => one.key === chosenPalette)?.tokens ?? null,
    [palettes, chosenPalette]
  );

  /** The address the preview's bar shows: a connected domain, the shop's own, or the one it will get. */
  const shownHostname =
    (addressMode === "own" && domainLive && domain?.hostname) ||
    storeHostname ||
    (nameCheck.state === "ok" ? nameCheck.hostname : "");

  /** Where "Open" takes the owner once the shop is live: their domain, or the shop's own address. */
  const liveUrl =
    addressMode === "own" && domainLive && domain ? storefrontUrlFor(domain.hostname) : storeUrl;

  return {
    ready,
    phase,
    direction,
    error,
    busy,
    stepError,
    back,
    go,
    logout,
    // sell
    kind,
    setKind: (next: ShopKind) => {
      setKind(next);
      setStepError(null);
    },
    continueFromSell,
    // name
    shopName,
    setShopName: (next: string) => {
      setShopName(next);
      setStepError(null);
    },
    nameCheck,
    storeMade: storeId !== null,
    /** The shop's public id, once it is made. */
    storeId,
    askOwnerName,
    ownerFirst,
    setOwnerFirst,
    ownerLast,
    setOwnerLast,
    continueFromName,
    // address
    storeHostname,
    addressMode,
    setAddressMode,
    domainInput,
    setDomainInput,
    domain,
    domainError,
    domainCheck,
    domainLive,
    connectOwnDomain,
    checkOwnDomain,
    pickAnotherDomain,
    // look
    palettes,
    chosenPalette,
    setPalette,
    paletteTokens,
    // contact
    phone,
    setPhone: (next: string) => {
      setPhone(next);
      setContactError(null);
    },
    whatsapp,
    setWhatsapp,
    facebook,
    setFacebook: (next: string) => {
      setFacebook(next);
      setContactError(null);
    },
    contactError,
    finish,
    // finishing, ready
    ticks,
    guide,
    // the preview
    shownHostname,
    liveUrl,
    phoneForShop: normalizeBdMobile(phone),
  };
}

export type SetupState = ReturnType<typeof useSetup>;
