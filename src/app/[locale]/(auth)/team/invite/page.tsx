"use client";

import { Check, Clock, Fingerprint, Mail } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { AuthDivider, AuthError, AuthHeading } from "@/components/auth/AuthParts";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import { Link } from "@/i18n/navigation";
import api from "@/lib/api";
import { isApiHttpError } from "@/lib/api-client";
import { heldClaims } from "@/lib/accounts/pass";
import { chooseShop } from "@/lib/active-shop";
import { signOut } from "@/lib/auth";
import { isNetworkError } from "@/lib/network-error";
import { withNext } from "@/lib/safe-next";
import { ROLE_MESSAGES, isRoleSlug } from "@/config/permissions";
import { inviteDay, inviteScreen, parseInvitePreview, type InvitePreview } from "@/lib/team/invite-page";

/** The steps of the page: what the API said (`ready`), then in. */
type Phase = "loading" | "broken" | "unreachable" | "ready" | "joined";

const LINK = "font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground";

/** The shop that sent the invite: its logo (or its first letter) and its name. */
function ShopMark({ store }: { store: InvitePreview["store"] }) {
  const t = useTranslations("teamInvite");
  return (
    <div className="flex items-center gap-3">
      {store.logo_url ? (
        <img
          src={store.logo_url}
          alt=""
          className="size-11 shrink-0 rounded-card border border-border bg-background object-contain"
        />
      ) : (
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-card border border-border bg-muted text-lg font-semibold text-foreground"
        >
          {store.name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-wide text-foreground">{store.name}</p>
        <p className="text-xs text-muted-foreground">{t("onPaperbase")}</p>
      </div>
    </div>
  );
}

/** A screen of the page: the shop when it is known, the serif heading, and what to do. */
function Screen({
  store,
  title,
  body,
  children,
}: {
  store?: InvitePreview["store"];
  title: string;
  body?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="pb-stagger space-y-6">
      {store ? <ShopMark store={store} /> : null}
      <AuthHeading title={title} body={body} />
      {children}
    </div>
  );
}

/**
 * The page an invited person opens from the email (owner, 2026-10-02): in the sign-in pages' frame,
 * the shop, who invited them and the role they will have, then the one thing to do -- join, or
 * create their Paperbase account at Accounts (its sign-up asks their name, then a passkey) and come
 * back here signed in to join -- or, when the invite is over or meant for another account, a
 * screen that says so (lib/team/invite-page.ts).
 */
export default function TeamInvitePage() {
  const t = useTranslations("teamInvite");
  const tAuth = useTranslations("auth");
  const tTeam = useTranslations("settings.team");
  const locale = useLocale();
  const token = useSearchParams().get("token") ?? "";

  const [phase, setPhase] = useState<Phase>("loading");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Signing in or up happens at Accounts, which comes back here to accept.
  const invitePath = `/team/invite?token=${encodeURIComponent(token)}`;
  const signInHref = withNext("/login", invitePath);
  const signUpHref = withNext("/signup", invitePath);

  /** Ask the API what the invite is now; the page shows that. */
  const load = useCallback(async (): Promise<InvitePreview | null> => {
    if (!token) {
      setPhase("broken");
      return null;
    }
    try {
      const { data } = await api.post<unknown>("team/invites/preview/", { token });
      const read = parseInvitePreview(data);
      setPreview(read);
      setPhase(read ? "ready" : "broken");
      return read;
    } catch (err) {
      setPhase(isApiHttpError(err) && (err.status === 404 || err.status === 400) ? "broken" : "unreachable");
      return null;
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAccept() {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post<{ store: { public_id: string } }>("team/invites/accept/", { token });
      // Passes carry no shop: the dashboard opens in the shop just joined by naming it.
      const person = heldClaims()?.sub;
      if (person) chooseShop(person, data.store.public_id);
      setPhase("joined");
    } catch (err) {
      if (isNetworkError(err)) {
        setError(tAuth("unreachable"));
      } else {
        // Refused: the invite or the account changed since the page opened -- show what it is now.
        const now = await load();
        if (now && inviteScreen(now) === "accept") setError(t("failed"));
      }
    } finally {
      setBusy(false);
    }
  }

  if (phase === "loading") {
    return (
      <Screen title={t("loadingTitle")}>
        <div aria-busy className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </Screen>
    );
  }

  if (phase === "unreachable") {
    return (
      <Screen title={t("unreachableTitle")} body={tAuth("unreachable")}>
        <Button
          type="button"
          className="h-11 w-full"
          onClick={() => {
            setPhase("loading");
            void load();
          }}
        >
          {t("tryAgain")}
        </Button>
      </Screen>
    );
  }

  if (phase === "broken" || !preview) {
    return (
      <Screen title={t("brokenTitle")} body={t("brokenBody")}>
        <Button variant="outline" asChild className="h-11 w-full">
          <Link href="/">{t("goToPaperbase")}</Link>
        </Button>
      </Screen>
    );
  }

  const { store, inviter } = preview;
  // One of the three fixed roles, named in the reader's language; the API's words otherwise.
  const role = isRoleSlug(preview.role.slug)
    ? {
        name: tTeam(ROLE_MESSAGES[preview.role.slug].name),
        description: tTeam(ROLE_MESSAGES[preview.role.slug].summary),
      }
    : preview.role;
  const shop = store.name;

  if (phase === "joined") {
    return (
      <div className="pb-stagger space-y-6">
        <span className="flex size-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Check className="size-5" aria-hidden />
        </span>
        <AuthHeading title={t("joinedTitle")} body={t("joinedBody", { shop, role: role.name })} />
        {/* A full load: the dashboard starts again in the shop just joined. */}
        <Button type="button" className="h-11 w-full" onClick={() => window.location.assign("/")}>
          {t("openShop", { shop })}
        </Button>
      </div>
    );
  }

  const screen = inviteScreen(preview);
  const day = inviteDay(preview.expires_at, locale);
  const goHome = (
    <Button variant="outline" asChild className="h-11 w-full">
      <Link href="/">{t("goToPaperbase")}</Link>
    </Button>
  );
  const signOutHere = (
    <Button type="button" className="h-11 w-full" onClick={() => void signOut(invitePath)}>
      {t("signOutContinue")}
    </Button>
  );

  switch (screen) {
    case "already_member":
      return (
        <Screen store={store} title={t("alreadyTitle", { shop })} body={t("alreadyBody")}>
          <Button asChild className="h-11 w-full">
            <Link href="/">{t("openDashboard")}</Link>
          </Button>
        </Screen>
      );
    case "ended":
      return (
        <Screen
          store={store}
          title={t("endedTitle")}
          body={inviter ? t("endedBody", { date: day, name: inviter.name }) : t("endedBodyNoName", { date: day })}
        >
          {goHome}
        </Screen>
      );
    case "cancelled":
      return (
        <Screen
          store={store}
          title={t("cancelledTitle")}
          body={inviter ? t("cancelledBody", { shop, name: inviter.name }) : t("cancelledBodyNoName", { shop })}
        >
          {goHome}
        </Screen>
      );
    case "used":
      return (
        <Screen store={store} title={t("usedTitle")} body={t("usedBody", { shop })}>
          {preview.viewer ? (
            goHome
          ) : (
            <Button asChild className="h-11 w-full">
              <Link href={signInHref}>{t("signIn")}</Link>
            </Button>
          )}
        </Screen>
      );
    case "someone_else":
      return (
        <Screen
          store={store}
          title={t("someoneElseTitle")}
          body={t("someoneElseBody", { invited: preview.email_masked, email: preview.viewer?.email ?? "" })}
        >
          <div className="space-y-3">
            {signOutHere}
            <Button variant="outline" asChild className="h-11 w-full">
              <Link href="/">{t("myDashboard")}</Link>
            </Button>
          </div>
        </Screen>
      );
    case "owns_store":
      return (
        <Screen store={store} title={t("ownsStoreTitle")} body={t("ownsStoreBody")}>
          {signOutHere}
        </Screen>
      );
    case "unverified":
      return (
        <Screen store={store} title={t("unverifiedTitle")} body={t("unverifiedBody")}>
          {goHome}
        </Screen>
      );
    default:
      break;
  }

  // The invite itself: the shop, who sent it, the role, then join or create an account.
  return (
    <div className="pb-stagger space-y-6">
      <ShopMark store={store} />
      <div>
        <AuthHeading title={t("joinTitle", { shop })} />
        <div className="mt-3 flex items-center gap-2.5 text-sm text-muted-foreground">
          {inviter ? <UserAvatar publicId={inviter.avatar_seed} name={inviter.name} className="size-6" /> : null}
          <p>{inviter ? t("invitedBy", { name: inviter.name }) : t("invitedNoName")}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-card border border-border px-4 py-3.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("yourRole")}</p>
          <p className="mt-1 text-base font-semibold text-foreground">{role.name}</p>
          {role.description ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{role.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Mail className="size-3.5" aria-hidden />
            {t("forEmail", { email: preview.email_masked })}
          </span>
          {day ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden />
              {t("endsOn", { date: day })}
            </span>
          ) : null}
        </div>
      </div>

      {error ? <AuthError>{error}</AuthError> : null}

      {screen === "accept" ? (
        <div>
          <Button type="button" loading={busy} onClick={() => void handleAccept()} className="h-11 w-full">
            {t("join", { shop })}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {t("signedInAs", { email: preview.viewer?.email ?? "" })} ·{" "}
            <button type="button" onClick={() => void signOut(invitePath)} className={LINK}>
              {t("notYou")}
            </button>
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <Button asChild className="h-11 w-full">
              <Link href={signUpHref}>
                <Fingerprint className="size-[18px]" aria-hidden />
                {t("acceptCreate")}
              </Link>
            </Button>
            <p className="mt-2.5 text-center text-xs leading-relaxed text-muted-foreground">{t("passkeyHint")}</p>
          </div>
          <AuthDivider>{t("or")}</AuthDivider>
          <p className="text-center text-sm text-muted-foreground">
            {t("haveAccount")}{" "}
            <Link href={signInHref} className={LINK}>
              {t("signInToAccept")}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
