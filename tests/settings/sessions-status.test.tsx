/**
 * Settings > Sessions: what the history's status column says about a sign-in that has ended,
 * for each reason Accounts gives. A reason the tab does not know reads "Expired", so a new one
 * must be named here too. Accounts 0.10.0 ends a person's sign-ins with `email_changed` when
 * Paperbase support changes their sign-in email; the row says so, like a switch-off. Drawn in
 * both languages, with a missing word failing.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { activeSessionsQueryKey, sessionHistoryQueryKey } from "@/lib/query-keys";
import type { SignInSessionRow } from "@/lib/sessions";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

vi.mock("@/context/ConfirmDialogContext", () => ({ useConfirm: () => async () => false }));

const { default: SessionsSection } = await import(
  "@/app/[locale]/(dashboard)/settings/sections/SessionsSection"
);

const strict = (error: unknown) => {
  throw error;
};

function ended(end_reason: SignInSessionRow["end_reason"]): SignInSessionRow {
  return {
    public_id: "ses_1",
    name: "Rahim",
    email: "rahim@example.com",
    role: "Owner",
    is_support: false,
    method: "passkey",
    device: "Chrome on Windows",
    device_kind: "desktop",
    ip_address: "103.0.0.1",
    city: "Dhaka",
    country: "Bangladesh",
    created_at: "2026-10-14T10:00:00Z",
    last_seen_at: "2026-10-14T11:00:00Z",
    ended_at: "2026-10-14T11:05:00Z",
    end_reason,
    ended_by: "",
    is_live: false,
    is_current: false,
  };
}

/** The history's status cell for one ended sign-in: its class list and its words. */
function statusOf(row: SignInSessionRow, locale: "en" | "bn" = "en") {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(activeSessionsQueryKey, []);
  client.setQueryData(sessionHistoryQueryKey(1), { count: 1, page: 1, pages: 1, results: [row] });
  const html = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : bn} timeZone="Asia/Dhaka" onError={strict}>
        <SessionsSection hidden={false} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  const cells = [...html.matchAll(/<span class="(inline-flex rounded-full[^"]*)">([^<]*)<\/span>/g)];
  expect(cells, "one status cell").toHaveLength(1);
  return { classes: cells[0][1], label: cells[0][2] };
}

describe("Sessions status", () => {
  it("says Paperbase changed the sign-in email, in amber like a switch-off", () => {
    const cell = statusOf(ended("email_changed"));
    expect(cell.label).toBe(en.settings.sessions.status.emailChanged);
    expect(cell.label).toBe("Email changed by Paperbase");
    expect(cell.classes).toContain("bg-amber-100");
  });

  it("says it in Bangla too", () => {
    expect(statusOf(ended("email_changed"), "bn").label).toBe(bn.settings.sessions.status.emailChanged);
    expect(bn.settings.sessions.status.emailChanged).not.toBe(en.settings.sessions.status.emailChanged);
  });

  it("keeps the switch-off's own words", () => {
    const cell = statusOf(ended("switched_off"));
    expect(cell.label).toBe(en.settings.sessions.status.switchedOff);
    expect(cell.classes).toContain("bg-amber-100");
  });

  it("reads Expired only when no reason is given", () => {
    const cell = statusOf(ended(""));
    expect(cell.label).toBe(en.settings.sessions.status.expired);
    expect(cell.classes).toContain("bg-muted");
  });
});
