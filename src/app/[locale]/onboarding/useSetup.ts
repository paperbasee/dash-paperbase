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
import { readSellsOn, sameSellsOn, toggleSellsOn, type SellsOn } from "@/lib/sells-on";
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
 *
 * **Every step saves on its own button** (owner, 2026-09-29, "like Shopify"): the look on
 * Continue (store/setup/look/), the phone and accounts on Finish (Identity), and coming back --
 * any tab, any device -- reads every answer from the shop (GET store/setup/). Only what is
 * answered before the shop exists waits in the tab, until the name step makes it.
 *
 * **The end has its own address**, `?step=done`: Finish moves there, and a reload of it shows
 * the shop live again -- only "Go to dashboard" leaves it (owner, 2026-09-29).
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

export type FinishTick = "contact" | "address" | "dashboard";

/** What setup has saved, as GET store/setup/ reads it from the shop. */
type SetupAnswers = {
  kind: string;
  sells_on: unknown;
  name: string;
  palette: string | null;
  phone: string;
  whatsapp: boolean;
  facebook: string;
  finished: boolean;
};

/** The step a `?step=` names, when it names one. */
function stepFrom(value: string | null): SetupStep | null {
  return (SETUP_STEPS as readonly string[]).includes(value ?? "") ? (value as SetupStep) : null;
}

/**
 * What the owner answers before the shop exists -- what it sells, its name -- kept in this tab so
 * a reload on the name step does not lose it. Once the name step makes the shop, the shop is the
 * record of every answer and this is cleared.
 */
type Draft = {
  user: string;
  kind?: ShopKind | null;
  sellsOn?: SellsOn[];
  shopName?: string;
  ownerFirst?: string;
  ownerLast?: string;
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
  const { isAuthenticated, isLoading: authLoading, authHydrated, signOut } = useAuth();

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState("");
  // The step is the page's address (`?step=look`), so a reload stays on it and the browser's
  // Back goes back a step. "finishing" and "ready" are not steps: they are what Finish shows.
  const urlStep = stepFrom(searchParams.get("step"));
  // Whether the page was opened at setup's end: read on arrival only, since Finish moves the
  // address there itself and where to start must not be worked out again mid-finish.
  const [arrivedAtDone] = useState(() => searchParams.get("step") === "done");
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
  // "Where do you sell now?": optional, any places or "just starting" (lib/sells-on).
  const [sellsOn, setSellsOn] = useState<SellsOn[]>([]);
  const [savedSellsOn, setSavedSellsOn] = useState<SellsOn[]>([]);
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
  // The palette the shop has now: the look step saves only a change.
  const [savedPalette, setSavedPalette] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState(true);
  const [facebook, setFacebook] = useState("");
  const [contactError, setContactError] = useState<"phone" | "facebook" | null>(null);

  const [ticks, setTicks] = useState<Record<FinishTick, "todo" | "now" | "done">>({
    contact: "todo",
    address: "todo",
    dashboard: "todo",
  });
  const [guide, setGuide] = useState<SetupGuide | null>(null);
  // Finish ran in this visit: the end is the launch, not a reload of it.
  const [justFinished, setJustFinished] = useState(false);

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
        setUser(me.public_id ?? "");
        setOwnerFirst(me.first_name || "");
        setOwnerLast(me.last_name || "");
        setAskOwnerName(!(me.first_name ?? "").trim() || !(me.last_name ?? "").trim());
        const finished = Boolean(me.store) && !setupUnfinished(me);
        if (me.store && (!finished || arrivedAtDone)) {
          // The shop exists: every answer is the shop's own, wherever it was given.
          const [{ data: saved }, { data: shop }] = await Promise.all([
            api.get<SetupAnswers>("store/setup/"),
            api.get<{ storefront_url?: string }>("store/"),
          ]);
          if (cancelled) return;
          const madeAs = kindFromStoreType(saved.kind);
          setStoreId(me.store.public_id);
          setKind(madeAs);
          setSavedKind(madeAs);
          setSellsOn(readSellsOn(saved.sells_on));
          setSavedSellsOn(readSellsOn(saved.sells_on));
          setShopName(saved.name);
          setSavedName(saved.name);
          setPalette(saved.palette);
          setSavedPalette(saved.palette);
          // The box sits after +880: the number without its leading 0.
          setPhone(saved.phone.replace(/^0/, ""));
          if (saved.phone) setWhatsapp(saved.whatsapp);
          setFacebook(saved.facebook);
          setStoreHostname(hostnameOf(shop.storefront_url));
          setStoreUrl(shop.storefront_url ?? "");
          writeDraft(null);
          if (finished) {
            // Setup is done and the address is its end: the shop, live, again.
            const nextGuide = await fetchSetupGuide();
            if (cancelled) return;
            setGuide(nextGuide);
            setEndPhase("ready");
          }
        } else if (me.active_store_public_id && !isAddMode) {
          router.replace("/");
          return;
        }
        if (!me.store) {
          // No shop yet: what was answered before it, in this tab.
          const draft = readDraft(me.public_id ?? "");
          if (draft) {
            setKind(draft.kind ?? null);
            setSellsOn(readSellsOn(draft.sellsOn));
            setShopName(draft.shopName ?? "");
            if (draft.ownerFirst) setOwnerFirst(draft.ownerFirst);
            if (draft.ownerLast) setOwnerLast(draft.ownerLast);
          }
        }
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authHydrated, authLoading, isAuthenticated, isAddMode, arrivedAtDone, router]);

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

  // What is answered before the shop exists, kept in this tab until the name step makes it (Draft).
  useEffect(() => {
    if (!ready || !user || storeId) return;
    writeDraft({ user, kind, sellsOn, shopName, ownerFirst, ownerLast });
  }, [ready, user, storeId, kind, sellsOn, shopName, ownerFirst, ownerLast]);

  // ---- a domain made on an earlier visit comes back with its records --------------------------
  useEffect(() => {
    if ((phase !== "address" && phase !== "ready") || !storeId || !DOMAINS_ENABLED || domain) return;
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
        // Past the last question, the address says so (owner, 2026-09-29): `?step=done` is no
        // step, and a reload of it opens the dashboard once setup has finished (the layout's
        // rule) -- or, if Finish did not get through, the first step still open.
        if (next === "finishing") {
          router.replace({ pathname: "/onboarding", query: { step: "done", ...(isAddMode ? { add: "1" } : {}) } });
        }
        return;
      }
      setEndPhase(null);
      if (next !== urlStep) router.push(stepHref(next));
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    },
    [router, stepHref, urlStep, isAddMode]
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
    const kindChanged = kind !== savedKind;
    const sellsOnChanged = !sameSellsOn(sellsOn, savedSellsOn);
    if (storeId && (kindChanged || sellsOnChanged)) {
      setBusy(true);
      try {
        if (kindChanged) {
          await saveBranding({ store_type: STORE_TYPE_BY_KIND[kind] });
          setSavedKind(kind);
        }
        if (sellsOnChanged) {
          await api.post("store/setup/sells-on/", { sells_on: sellsOn });
          setSavedSellsOn(sellsOn);
        }
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
      sells_on: sellsOn,
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
    setSavedSellsOn(sellsOn);
    writeDraft(null); // the shop is the record now
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

  // ---- the look -------------------------------------------------------------------------------
  /** The look step's Continue: the palette goes live now, not at the end. */
  async function continueFromLook() {
    setBusy(true);
    try {
      if (chosenPalette !== savedPalette) {
        await api.post("store/setup/look/", { palette: chosenPalette });
        setSavedPalette(chosenPalette);
      }
      go("contact");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  // ---- the last saves --------------------------------------------------------------------------
  async function finish() {
    const mobile = normalizeBdMobile(phone);
    if (!mobile) {
      setContactError("phone");
      return;
    }
    setContactError(null);
    setError(null);
    setTicks({ contact: "now", address: "todo", dashboard: "todo" });
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
      setTicks((t) => ({ ...t, contact: "done", address: "now" }));
      // Every other answer was saved on its own step: this only says setup is done.
      await atLeast(api.post("store/setup/finish/"));
      setTicks((t) => ({ ...t, address: "done", dashboard: "now" }));
      invalidateMeRoutingCache();
      const [nextGuide] = await atLeast(Promise.all([fetchSetupGuide(), fetchMeForRouting()]));
      setGuide(nextGuide);
      setTicks((t) => ({ ...t, dashboard: "done" }));
      setJustFinished(true);
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

  /** A domain the owner has is serving the shop -- connected, not merely started. */
  const usingOwnDomain = addressMode === "own" && domainLive && Boolean(domain);

  /** The address the preview's bar shows: a connected domain, the shop's own, or the one it will get. */
  const shownHostname =
    (usingOwnDomain && domain?.hostname) ||
    storeHostname ||
    (nameCheck.state === "ok" ? nameCheck.hostname : "");

  /** Where "Open" takes the owner once the shop is live: their domain, or the shop's own address. */
  const liveUrl = usingOwnDomain && domain ? storefrontUrlFor(domain.hostname) : storeUrl;

  return {
    ready,
    phase,
    direction,
    error,
    busy,
    stepError,
    back,
    go,
    /** Setup's Sign out: a press, so the API ends the sign-in too. */
    logout: signOut,
    // sell
    kind,
    setKind: (next: ShopKind) => {
      setKind(next);
      setStepError(null);
    },
    sellsOn,
    toggleSellsOn: (key: SellsOn) => setSellsOn((current) => toggleSellsOn(current, key)),
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
    usingOwnDomain,
    connectOwnDomain,
    checkOwnDomain,
    pickAnotherDomain,
    // look
    palettes,
    chosenPalette,
    setPalette,
    continueFromLook,
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
    justFinished,
    // the preview
    shownHostname,
    liveUrl,
    phoneForShop: normalizeBdMobile(phone),
  };
}

export type SetupState = ReturnType<typeof useSetup>;
