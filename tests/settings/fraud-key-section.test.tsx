/**
 * Settings > Fraud check (phase 5a, owner 2026-11-17; guidelines/own-fraud-key-plan.md): one choice,
 * Paperbase's check or the shop's own key; a provider from the list and its token, shown by its last
 * four only, with a Test key button; the line about sharing; a failing key said loudly; Premium only,
 * the key kept when the plan ends. Drawn in both languages, with a missing word failing.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { parseFraudKey, type FraudKey } from "@/lib/fraud-key";
import { fraudKeyQueryKey } from "@/lib/query-keys";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

const support = vi.hoisted(() => ({ on: false }));
vi.mock("@/hooks/useSupportMode", () => ({ useSupportMode: () => support.on }));
vi.mock("@/context/ConfirmDialogContext", () => ({ useConfirm: () => async () => false }));

const { default: FraudCheckSection } = await import(
  "@/app/[locale]/(dashboard)/settings/sections/FraudCheckSection"
);

const strict = (error: unknown) => {
  throw error;
};

const BASE = parseFraudKey({
  mode: "paperbase",
  provider: "bdcourier",
  providers: [{ value: "bdcourier", label: "BD Courier" }],
  has_token: false,
  token_last4: null,
  state: "missing",
  failing: null,
  working_at: null,
  shares_answers: true,
  included: true,
});

/** The markup with its escaped characters read back, so words compare as written. */
const unescaped = (html: string) =>
  html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

function draw(fields: Partial<FraudKey> = {}, locale: "en" | "bn" = "en") {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(fraudKeyQueryKey, { ...BASE, ...fields });
  return unescaped(renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : bn} timeZone="Asia/Dhaka" onError={strict}>
        <FraudCheckSection hidden={false} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  ));
}

const OWN: Partial<FraudKey> = { mode: "own", hasToken: true, tokenLast4: "9876", state: "untested" };
const words = en.settings.fraudKey;

describe("Settings > Fraud check", () => {
  it("is one choice: Paperbase's check or my own key", () => {
    const html = draw();
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain(words.paperbase);
    expect(html).toContain(words.own);
    expect(html).toMatch(/aria-checked="true"[^>]*>[\s\S]*?Paperbase/);
    // Nothing about a key while Paperbase's check is chosen.
    expect(html).not.toContain(words.tokenLabel);
  });

  it("on its own key: the provider, the token by its last four, and Test key", () => {
    const html = draw(OWN);
    expect(html).toContain("BD Courier");
    expect(html).toContain(">9876<");
    expect(html).toContain(words.test);
    expect(html).toContain(words.remove);
    expect(html).toContain(words.testNote);
    expect(html).toContain(words.noFallback);
  });

  it("says answers are shared, only while Paperbase shares them", () => {
    expect(draw(OWN)).toContain(words.sharing);
    expect(draw({ ...OWN, sharesAnswers: false })).not.toContain(words.sharing);
  });

  it("asks for a token when none is saved", () => {
    const html = draw({ mode: "own" });
    expect(html).toContain(words.tokenLabel);
    expect(html).not.toContain(words.test);
  });

  it("says loudly when the key fails, in the provider's words", () => {
    const html = draw({ ...OWN, state: "failing", failing: { since: "2026-11-24T02:00:00Z", detail: "Invalid API key" } });
    expect(html).toContain('role="alert"');
    expect(html).toContain("Invalid API key");
    expect(html).toContain(words.failingTitle);
  });

  it("says a working key works", () => {
    expect(draw({ ...OWN, state: "working", workingAt: "2026-11-24T02:00:00Z" })).toContain(words.stateWorking);
  });

  it("is Premium, and keeps the key when the plan ends", () => {
    const html = draw({ ...OWN, included: false });
    expect(html).toContain(words.premium);
    expect(html).toContain(words.keptNote);
    expect(html).toMatch(/<fieldset[^>]*disabled/);
  });

  it("is only read in a support visit", () => {
    support.on = true;
    try {
      expect(draw(OWN)).toContain(en.supportMode.readOnly);
    } finally {
      support.on = false;
    }
  });

  it("reads in Bangla", () => {
    const html = draw({ ...OWN, state: "failing", failing: { since: "2026-11-24T02:00:00Z", detail: "Invalid API key" } }, "bn");
    expect(html).toContain(bn.settings.fraudKey.own);
    expect(html).toContain(bn.settings.fraudKey.failingTitle);
    expect(bn.settings.fraudKey.own).not.toBe(words.own);
  });

  it("has every word in both languages", () => {
    expect(Object.keys(bn.settings.fraudKey).sort()).toEqual(Object.keys(words).sort());
    expect(bn.settings.sectionFraudCheck).toBeTruthy();
  });
});
