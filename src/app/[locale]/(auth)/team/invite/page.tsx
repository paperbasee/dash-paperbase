"use client";

import { Check, Clock, Fingerprint, Lock, Mail } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";

import { AuthDivider, AuthError, AuthHeading } from "@/components/auth/AuthParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { Link } from "@/i18n/navigation";
import api from "@/lib/api";
import { isApiHttpError } from "@/lib/api-client";
import { signOut, storeAuthTokens } from "@/lib/auth";
import { isNetworkError } from "@/lib/network-error";
import { browserSupportsWebAuthn, isPasskeyCancellation } from "@/lib/passkeys";
import { withNext } from "@/lib/safe-next";
import { inviteDay, inviteScreen, parseInvitePreview, type InvitePreview } from "@/lib/team/invite-page";

/** The steps of the page: what the API said (`ready`), then the new person's name, then in. */
type Phase = "loading" | "broken" | "unreachable" | "ready" | "create" | "joined";

const LINK = "font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

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
 * create their Paperbase account (their own name, then a passkey) -- or, when the invite is over or
 * meant for another account, a screen that says so (lib/team/invite-page.ts).
 */
export default function TeamInvitePage() {
  const t = useTranslations("teamInvite");
  const tAuth = useTranslations("auth");
  const locale = useLocale();
  const token = useSearchParams().get("token") ?? "";
  const { enrollPasskey } = useAuth();

  const [phase, setPhase] = useState<Phase>("loading");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [supportsPasskeys, setSupportsPasskeys] = useState<boolean | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameError, setNameError] = useState("");
  const [accountExists, setAccountExists] = useState(false);
  // The account is made once: a passkey cancelled half-way retries with the same ticket.
  const [ticket, setTicket] = useState("");
  const [accountReady, setAccountReady] = useState(false);

  const invitePath = `/team/invite?token=${encodeURIComponent(token)}`;
  const signInHref = withNext("/login", invitePath);

  useEffect(() => {
    setSupportsPasskeys(browserSupportsWebAuthn());
  }, []);

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
      const { data } = await api.post<{ access?: string; refresh?: string }>("team/invites/accept/", { token });
      // The tokens name the shop just joined, so the dashboard opens in it without a new sign-in.
      if (data.access && data.refresh) storeAuthTokens(data.access, data.refresh);
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

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError("");
    setAccountExists(false);
    const first = firstName.trim();
    if (!first) {
      setNameError(t("nameRequired"));
      return;
    }
    setBusy(true);
    let enrollment = ticket;
    if (!enrollment) {
      try {
        const { data } = await api.post<{ enrollment_ticket: string }>("team/invites/accept-new/", {
          token,
          first_name: first,
          last_name: lastName.trim(),
        });
        enrollment = data.enrollment_ticket;
        setTicket(enrollment);
      } catch (err) {
        setBusy(false);
        const body = isApiHttpError(err) && isRecord(err.data) ? err.data : null;
        if (isNetworkError(err)) {
          setError(tAuth("unreachable"));
        } else if (body && "email" in body) {
          setAccountExists(true);
          setError(t("accountExists"));
        } else if (body && "first_name" in body) {
          setNameError(t("nameRequired"));
        } else {
          // The invite ended, was cancelled or used while the form was open.
          const now = await load();
          if (now && inviteScreen(now) === "join") {
            setPhase("create");
            setError(t("failed"));
          }
        }
        return;
      }
    }
    try {
      const done = await enrollPasskey({ enrollmentTicket: enrollment });
      if (done.tokens) setPhase("joined");
      else setAccountReady(true);
    } catch (err) {
      if (isPasskeyCancellation(err)) setError(t("passkeyCancelled"));
      else if (isNetworkError(err)) setError(tAuth("unreachable"));
      // The account and its place on the team exist; signing in by email finishes it.
      else setAccountReady(true);
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

  const { store, role, inviter } = preview;
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

  if (phase === "create") {
    return (
      <Screen
        store={store}
        title={t("createTitle")}
        body={t("createBody", { shop, role: role.name })}
      >
        {accountReady ? (
          <div className="space-y-4">
            <AuthError>{t("accountReady", { shop })}</AuthError>
            <Button asChild className="h-11 w-full">
              <Link href={signInHref}>{t("signIn")}</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreate} noValidate className="space-y-4">
            <div className="form-field">
              <span className="field-label">{t("email")}</span>
              <div className="flex h-11 items-center justify-between gap-3 rounded-xs border border-border bg-muted/40 px-4 text-sm text-foreground">
                <span className="truncate">{preview.email_masked}</span>
                <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-field">
                <label htmlFor="invite-first-name" className="field-label">
                  {t("firstName")}
                </label>
                <Input
                  id="invite-first-name"
                  size="lg"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setNameError("");
                  }}
                  placeholder={t("firstNamePlaceholder")}
                  autoComplete="given-name"
                  aria-invalid={nameError ? true : undefined}
                  disabled={Boolean(ticket)}
                  autoFocus
                />
              </div>
              <div className="form-field">
                <label htmlFor="invite-last-name" className="field-label">
                  {t("lastName")}
                </label>
                <Input
                  id="invite-last-name"
                  size="lg"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t("lastNamePlaceholder")}
                  autoComplete="family-name"
                  disabled={Boolean(ticket)}
                />
              </div>
            </div>
            {nameError ? <p className="-mt-2 text-xs text-destructive">{nameError}</p> : null}
            {error ? (
              <AuthError>
                {error}
                {accountExists ? (
                  <>
                    {" "}
                    <Link href={signInHref} className={LINK}>
                      {t("signInToAccept")}
                    </Link>
                  </>
                ) : null}
              </AuthError>
            ) : null}
            <div>
              <Button type="submit" loading={busy} className="h-11 w-full">
                <Fingerprint className="size-[18px]" aria-hidden />
                {t("createPasskey")}
              </Button>
              <p className="mt-2.5 text-center text-xs leading-relaxed text-muted-foreground">{t("createHint")}</p>
            </div>
            {ticket ? null : (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setPhase("ready");
                }}
                className="mx-auto block text-sm text-muted-foreground hover:text-foreground"
              >
                ← {t("back")}
              </button>
            )}
          </form>
        )}
      </Screen>
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
    <Button type="button" className="h-11 w-full" onClick={() => signOut(invitePath)}>
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
            <button type="button" onClick={() => signOut(invitePath)} className={LINK}>
              {t("notYou")}
            </button>
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {supportsPasskeys === false ? (
            <p className="rounded-ui border border-border bg-muted/40 px-3 py-2 text-center text-sm text-muted-foreground">
              {t("noPasskeys")}
            </p>
          ) : (
            <div>
              <Button
                type="button"
                className="h-11 w-full"
                onClick={() => {
                  setError("");
                  setPhase("create");
                }}
              >
                <Fingerprint className="size-[18px]" aria-hidden />
                {t("acceptCreate")}
              </Button>
              <p className="mt-2.5 text-center text-xs leading-relaxed text-muted-foreground">{t("passkeyHint")}</p>
            </div>
          )}
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
