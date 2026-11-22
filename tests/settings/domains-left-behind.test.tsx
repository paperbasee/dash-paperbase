/**
 * Settings > Domains under step 16.5 (the owner, 2026-11-22: 1A and 2A; api 1.200.0): a merchant's domain a server
 * move left on our old server says so on its own row -- where it points, what to point it at by name, and the address
 * we have now -- in both languages; a domain that follows says nothing. And the setup steps say "by name first" with
 * the names DNS hosts give it, and our address only with the plain warning that the store goes down in a switch.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StoreDomain } from "@/lib/domains/api";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

const state = vi.hoisted(() => ({ domains: [] as StoreDomain[] }));

vi.mock("@/lib/domains/hooks", () => {
  const idle = () => ({ isPending: false, mutateAsync: async () => undefined });
  return {
    useDomainsQuery: () => ({ data: state.domains, isLoading: false, isError: false }),
    useConnectDomain: idle,
    useVerifyDomain: idle,
    useSetPrimaryDomain: idle,
    useRemoveDomain: idle,
    useCheckHttps: idle,
  };
});
vi.mock("@/context/ConfirmDialogContext", () => ({ useConfirm: () => async () => false }));
vi.mock("@/hooks/useOwnerPower", () => ({ useMayChangeOwnerPower: () => () => true }));
vi.mock("@/notifications", () => ({ notify: {} }));

const { default: DomainsSection } = await import(
  "@/app/[locale]/(dashboard)/settings/sections/DomainsSection"
);

const OLD = "65.109.162.70";
const NEW = "2.29.129.72";
const TARGET = "stores.paperbase.me";

function draw(locale: "en" | "bn" = "en") {
  return renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "en" ? en : bn}
      timeZone="Asia/Dhaka"
      onError={(error) => {
        throw error;
      }}
    >
      <DomainsSection hidden={false} />
    </NextIntlClientProvider>,
  );
}

const words = {
  en: en.settings.domains as Record<string, string>,
  bn: bn.settings.domains as Record<string, string>,
};

/** A message as it reaches the page, its placeholders filled in. */
function said(locale: "en" | "bn", key: string, values: Record<string, string> = {}): string {
  return Object.entries(values)
    .reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), words[locale][key])
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function domain(overrides: Partial<StoreDomain> = {}): StoreDomain {
  return {
    public_id: "dom_bare",
    hostname: "rahimbd.com",
    kind: "custom",
    status: "active",
    is_primary: true,
    ssl_status: "issued",
    ssl_checked_at: "2026-11-22T12:00:00Z",
    ssl_expires_at: "2027-02-20T00:00:00Z",
    ssl_error: "",
    verified_at: "2026-11-01T10:00:00Z",
    last_checked_at: "2026-11-22T12:00:00Z",
    check_error: "",
    created_at: "2026-11-01T09:00:00Z",
    removable: true,
    https_check: "ok",
    https_checked_at: "2026-11-22T12:20:00Z",
    left_behind: null,
    dns_records: [
      { type: "TXT", name: "_paperbase-verify.rahimbd.com", value: "pbv-token", note: "" },
      { type: "CNAME", name: "rahimbd.com", value: TARGET, note: "" },
      { type: "A", name: "rahimbd.com", value: NEW, note: "" },
    ],
    ...overrides,
  };
}

const LEFT = { old_address: OLD, new_address: NEW };
const NOTICE_KEYS = ["leftBehindTitle", "leftBehindBody", "leftBehindByName", "leftBehindByAddress"];

beforeEach(() => {
  state.domains = [];
});

describe("a domain a server move left on our old server", () => {
  it("says where it points, what to point it at by name, and our address now, in both languages", () => {
    state.domains = [domain({ left_behind: LEFT })];
    for (const locale of ["en", "bn"] as const) {
      const html = draw(locale);
      expect(html).toContain(said(locale, "leftBehindTitle"));
      expect(html).toContain(said(locale, "leftBehindBody", { oldAddress: OLD }));
      expect(html).toContain(said(locale, "leftBehindByName", { target: TARGET }));
      expect(html).toContain(said(locale, "leftBehindByAddress", { newAddress: NEW }));
    }
  });

  it("by name comes before the address", () => {
    state.domains = [domain({ left_behind: LEFT })];
    const html = draw();
    expect(html.indexOf(said("en", "leftBehindByName", { target: TARGET }))).toBeLessThan(
      html.indexOf(said("en", "leftBehindByAddress", { newAddress: NEW })),
    );
  });

  it("offers each value to copy", () => {
    state.domains = [domain({ left_behind: LEFT })];
    const html = draw();
    expect(html).toContain(said("en", "copyValueAria", { type: "CNAME" }));
    expect(html).toContain(said("en", "copyValueAria", { type: "A" }));
  });

  it("names no address of ours it does not know", () => {
    state.domains = [domain({ left_behind: { old_address: OLD, new_address: "" } })];
    const html = draw();
    expect(html).toContain(said("en", "leftBehindTitle"));
    expect(html).not.toContain(said("en", "leftBehindByAddress", { newAddress: "" }));
  });

  it("names no record the API did not give", () => {
    state.domains = [domain({ left_behind: LEFT, dns_records: [] })];
    const html = draw();
    expect(html).toContain(said("en", "leftBehindTitle"));
    expect(html).not.toContain(said("en", "leftBehindByName", { target: TARGET }));
  });

  it("shows on a domain that is not the main one too", () => {
    state.domains = [
      domain({ public_id: "dom_main", hostname: "rahimscloset.com" }),
      domain({ is_primary: false, left_behind: LEFT }),
    ];
    const html = draw();
    expect(html.split(said("en", "leftBehindTitle")).length - 1).toBe(1);
  });
});

describe("a domain that follows", () => {
  it("says nothing about an old server", () => {
    state.domains = [domain()];
    for (const locale of ["en", "bn"] as const) {
      const html = draw(locale);
      for (const key of NOTICE_KEYS) {
        expect(html).not.toContain(said(locale, key, { oldAddress: OLD, target: TARGET, newAddress: NEW }));
      }
    }
  });
});

describe("the setup steps, by name first", () => {
  it("name the ways DNS hosts point a main domain by name", () => {
    for (const locale of ["en", "bn"] as const) {
      for (const name of ["CNAME flattening", "ALIAS", "ANAME"]) {
        expect(words[locale].stepPointHintChoice).toContain(name);
      }
    }
  });

  it("warn plainly that our address takes the store down in a switch, until it is changed", () => {
    expect(words.en.fallbackWhy).toContain("goes down if we switch servers");
    expect(words.en.fallbackWhy).toContain("this page shows it");
    expect(words.bn.fallbackWhy).toContain("সার্ভার বদলালে");
  });
});
