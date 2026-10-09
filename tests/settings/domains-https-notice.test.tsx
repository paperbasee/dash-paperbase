/**
 * Settings > Domains under the plan to move every shop address to https (agreed 2026-10-09): a
 * merchant's own domain reads "Secure" only when its certificate is issued AND the outside check
 * found https working for shoppers; every other answer is one notice that says what to change, a
 * "Check again" sits beside it, and free addresses stay as they were. Drawn in both languages, with
 * a missing word failing.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StoreDomain, StoreDomainHttpsCheck, StoreDomainSslStatus } from "@/lib/domains/api";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

type MutationState = { isPending: boolean; variables?: string };

const state = vi.hoisted(() => ({
  domains: [] as StoreDomain[],
  checkHttps: { isPending: false } as MutationState,
  canManage: true,
}));

vi.mock("@/lib/domains/hooks", () => {
  const idle = () => ({ isPending: false, mutateAsync: async () => undefined });
  return {
    useDomainsQuery: () => ({ data: state.domains, isLoading: false, isError: false }),
    useConnectDomain: idle,
    useVerifyDomain: idle,
    useSetPrimaryDomain: idle,
    useRemoveDomain: idle,
    useCheckHttps: () => ({ ...state.checkHttps, mutateAsync: async () => undefined }),
  };
});
vi.mock("@/context/ConfirmDialogContext", () => ({ useConfirm: () => async () => false }));
vi.mock("@/hooks/useOwnerPower", () => ({ useMayChangeOwnerPower: () => () => state.canManage }));
vi.mock("@/notifications", () => ({ notify: {} }));

const { default: DomainsSection } = await import(
  "@/app/[locale]/(dashboard)/settings/sections/DomainsSection"
);

const strict = (error: unknown) => {
  throw error;
};

function draw(locale: "en" | "bn" = "en") {
  return renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "en" ? en : bn}
      timeZone="Asia/Dhaka"
      onError={strict}
    >
      <DomainsSection hidden={false} />
    </NextIntlClientProvider>,
  );
}

const words = {
  en: en.settings.domains as Record<string, string>,
  bn: bn.settings.domains as Record<string, string>,
};

/** The message as it reaches the page (React escapes quotes and ampersands). */
const shown = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

function custom(overrides: Partial<StoreDomain> = {}): StoreDomain {
  return {
    public_id: "dom_own",
    hostname: "sajwear.com",
    kind: "custom",
    status: "active",
    is_primary: true,
    ssl_status: "issued",
    ssl_checked_at: "2026-10-09T14:00:00Z",
    ssl_expires_at: "2026-12-30T00:00:00Z",
    ssl_error: "",
    verified_at: "2026-10-01T10:00:00Z",
    last_checked_at: "2026-10-09T14:00:00Z",
    check_error: "",
    created_at: "2026-10-01T09:00:00Z",
    removable: true,
    https_check: "ok",
    https_checked_at: "2026-10-09T14:01:00Z",
    ...overrides,
  };
}

function free(overrides: Partial<StoreDomain> = {}): StoreDomain {
  return custom({
    public_id: "dom_free",
    hostname: "sajwear.paperbase.me",
    kind: "subdomain",
    is_primary: false,
    removable: false,
    https_check: "",
    https_checked_at: null,
    ...overrides,
  });
}

const CHECKED = "2026-10-09T14:01:00Z";

/** Each answer of the outside check, on an issued certificate, and the notice it must show. */
const NOTICE_FOR: [StoreDomainHttpsCheck, string | null, string][] = [
  ["ok", CHECKED, "sslIssued"],
  ["", null, "httpsChecking"],
  ["", CHECKED, "httpsNoAnswer"],
  ["origin_over_http", CHECKED, "httpsOriginOverHttp"],
  ["edge_redirects_to_http", CHECKED, "httpsEdgeRedirectsToHttp"],
  ["edge_certificate_invalid", CHECKED, "httpsEdgeCertificateInvalid"],
  ["wrong_answer", CHECKED, "httpsWrongAnswer"],
];
const ALL_NOTICES = [...new Set(["sslPending", "sslFailed", ...NOTICE_FOR.map(([, , key]) => key)])];

beforeEach(() => {
  state.domains = [];
  state.checkHttps = { isPending: false };
  state.canManage = true;
});

describe("the notice beside a merchant's own live domain", () => {
  it.each(NOTICE_FOR)(
    "https_check %j (checked at %s) shows exactly its own notice, in both languages",
    (check, checkedAt, key) => {
      state.domains = [custom({ https_check: check, https_checked_at: checkedAt })];
      for (const locale of ["en", "bn"] as const) {
        const html = draw(locale);
        expect(html).toContain(shown(words[locale][key]));
        for (const other of ALL_NOTICES.filter((k) => k !== key)) {
          expect(html).not.toContain(shown(words[locale][other]));
        }
      }
    },
  );

  it("a certificate still coming or failed keeps today's notice, whatever the outside check holds", () => {
    const cases: [StoreDomainSslStatus, string][] = [
      ["none", "sslPending"],
      ["pending", "sslPending"],
      ["failed", "sslFailed"],
    ];
    for (const [ssl, key] of cases) {
      state.domains = [custom({ ssl_status: ssl, https_check: "ok" })];
      const html = draw();
      expect(html).toContain(shown(words.en[key]));
      expect(html).not.toContain(shown(words.en.sslIssued));
    }
  });

  /** The class list of the element whose text starts with `text`. */
  function classOf(html: string, text: string): string {
    const at = html.indexOf(`>${shown(text)}`);
    expect(at).toBeGreaterThan(-1);
    const open = html.lastIndexOf("<", at);
    return html.slice(open, at).match(/class="([^"]*)"/)?.[1] ?? "";
  }

  it("Secure is green, a change to make or a wait is amber, a failed certificate red", () => {
    state.domains = [custom()];
    expect(classOf(draw(), words.en.sslIssued)).toContain("text-emerald-700");
    for (const [check, checkedAt, key] of NOTICE_FOR.filter(([c]) => c !== "ok")) {
      state.domains = [custom({ https_check: check, https_checked_at: checkedAt })];
      expect(classOf(draw(), words.en[key])).toContain("text-amber-700");
    }
    state.domains = [custom({ ssl_status: "failed" })];
    expect(classOf(draw(), words.en.sslFailed)).toContain("text-destructive");
  });

  it("the fix is spelled out where it lives in Cloudflare", () => {
    expect(words.en.httpsOriginOverHttp).toContain("SSL/TLS → Overview");
    expect(words.en.httpsOriginOverHttp).toContain("Full (strict)");
    expect(words.en.httpsEdgeRedirectsToHttp).toContain("must not be Off");
    expect(words.bn.httpsOriginOverHttp).toContain("Full (strict)");
    expect(words.bn.httpsEdgeRedirectsToHttp).toContain("Off");
  });

  it("a domain that is not the live one carries its notice on its own row", () => {
    state.domains = [
      free({ is_primary: true }),
      custom({ is_primary: false, https_check: "wrong_answer" }),
    ];
    const html = draw();
    expect(html.split(shown(words.en.httpsWrongAnswer)).length - 1).toBe(1);
  });
});

describe("Check again", () => {
  const button = (html: string) => html.match(/<button[^>]*>(?:(?!<\/button>)[\s\S])*Check again<\/button>/g) ?? [];

  it("sits beside every merchant's own live domain, Secure or not", () => {
    for (const check of ["ok", "origin_over_http", ""] as const) {
      state.domains = [custom({ https_check: check })];
      expect(button(draw())).toHaveLength(1);
    }
    state.domains = [custom({ ssl_status: "pending" })];
    expect(button(draw())).toHaveLength(1);
  });

  it("never on a free address, nor on a domain still being connected", () => {
    state.domains = [free({ is_primary: true }), custom({ status: "pending", dns_records: [] })];
    expect(draw()).not.toContain("Check again");
  });

  it("reads in Bangla", () => {
    state.domains = [custom()];
    expect(draw("bn")).toContain(words.bn.checkHttpsAgain);
  });

  it("shows it is busy on the domain being checked, and holds the other buttons meanwhile", () => {
    state.domains = [
      custom(),
      custom({ public_id: "dom_two", hostname: "frenzowear.com", is_primary: false }),
    ];
    state.checkHttps = { isPending: true, variables: "dom_two" };
    const html = draw();
    expect(html.match(/aria-busy="true"/g)).toHaveLength(1);
    // The busy one shows a spinner in place of its words; the other is held, not spinning.
    expect(button(html)).toHaveLength(1);
    expect(button(html)[0]).toContain("disabled");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>(?:(?!<\/button>)[\s\S])*Make primary<\/button>/);
    // The spinner has no words, so the button keeps its name through the label: which domain.
    const busy = html.match(/<button[^>]*aria-busy="true"[^>]*>/)?.[0] ?? "";
    expect(busy).toContain('aria-label="Check again whether frenzowear.com is secure"');
  });

  it("says which domain each one checks, in both languages", () => {
    state.domains = [
      custom(),
      custom({ public_id: "dom_two", hostname: "frenzowear.com", is_primary: false }),
    ];
    const label = (locale: "en" | "bn", hostname: string) =>
      `aria-label="${shown(words[locale].checkHttpsAgainAria.replace("{hostname}", hostname))}"`;
    for (const locale of ["en", "bn"] as const) {
      const html = draw(locale);
      for (const hostname of ["sajwear.com", "frenzowear.com"]) {
        expect(html.split(label(locale, hostname)).length - 1).toBe(1);
      }
    }
    // The name keeps the words on the button (WCAG 2.5.3, label in name).
    expect(words.en.checkHttpsAgainAria).toContain(words.en.checkHttpsAgain);
    expect(words.bn.checkHttpsAgainAria).toContain(words.bn.checkHttpsAgain);
  });

  it("is held for a member who may not change domains", () => {
    state.domains = [custom()];
    expect(button(draw())[0]).not.toMatch(/^<button[^>]*\sdisabled=""/);
    state.canManage = false;
    expect(button(draw())[0]).toMatch(/^<button[^>]*\sdisabled=""/);
  });
});

describe("Cloudflare advice", () => {
  it("a standing hint sits beside where-to-add while the records are shown", () => {
    state.domains = [
      custom({
        status: "pending",
        dns_records: [{ type: "TXT", name: "_paperbase.sajwear.com", value: "pb=1", note: "" }],
      }),
    ];
    for (const locale of ["en", "bn"] as const) {
      const html = draw(locale);
      const where = html.indexOf(shown(words[locale].whereToAdd));
      const hint = html.indexOf(shown(words[locale].cloudflareHint));
      expect(where).toBeGreaterThan(-1);
      expect(hint).toBeGreaterThan(where);
    }
  });

  it("the hint and the onboarding tip name the word the Domains tab shows, and Full (strict)", () => {
    const tip = { en: en.auth.onboarding.cloudflareTip, bn: bn.auth.onboarding.cloudflareTip };
    expect(tip.en).toBe(
      "Using Cloudflare? Keep the cloud grey until the domain shows Secure; if you turn it orange later, use Full (strict).",
    );
    // "Secure" / "নিরাপদ" is the first word of the notice a secure domain shows.
    expect(words.en.sslIssued.startsWith("Secure")).toBe(true);
    expect(words.bn.sslIssued.startsWith("নিরাপদ")).toBe(true);
    for (const text of [tip.en, words.en.cloudflareHint]) {
      expect(text).toContain("Secure");
      expect(text).toContain("Full (strict)");
    }
    for (const text of [tip.bn, words.bn.cloudflareHint]) {
      expect(text).toContain("নিরাপদ");
      expect(text).toContain("Full (strict)");
    }
  });
});
