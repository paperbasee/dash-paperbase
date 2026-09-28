/**
 * Sign in, sign up and setup (owner, 2026-09-28): Shopify-like pages, with a sample shop that
 * becomes the owner's own as they answer. Five questions; the shop is made after the second.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import bn from "../../messages/bn.json";
import en from "../../messages/en.json";
import {
  SHOP_KINDS,
  STORE_TYPE_BY_KIND,
  SUGGESTED_PALETTE,
  heroPhoto,
  kindFromStoreType,
  productPhoto,
} from "@/components/shop-preview/samples";
import { normalizeBdMobile } from "@/lib/bd-mobile";
import { resolvePostAuthPath, type MeForRouting } from "@/lib/subscription-access";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

function keys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    keys(v, prefix ? `${prefix}.${k}` : k)
  );
}

describe("the sample shop", () => {
  test("every kind has its photo across the top and three products, on disk", () => {
    for (const kind of SHOP_KINDS) {
      for (const src of [heroPhoto(kind), productPhoto(kind, 1), productPhoto(kind, 2), productPhoto(kind, 3)]) {
        expect(fs.existsSync(path.join(ROOT, "public", src)), src).toBe(true);
      }
    }
  });

  test("every photo is credited", () => {
    const credits = read("src/components/shop-preview/PHOTO_CREDITS.md");
    for (const file of fs.readdirSync(path.join(ROOT, "public/onboarding"))) {
      expect(credits, file).toContain(`\`${file}\``);
    }
  });

  test("a kind saved as a store type reads back as that kind", () => {
    for (const kind of SHOP_KINDS) {
      expect(kindFromStoreType(STORE_TYPE_BY_KIND[kind])).toBe(kind);
    }
    expect(kindFromStoreType("Fashion and more")).toBeNull();
  });

  test("each kind's suggested look is one of the API's palettes", () => {
    const presets = path.resolve(ROOT, "../api-paperbase/engine/apps/theming/presets.py");
    if (!fs.existsSync(presets)) return;
    const palettes = [...fs.readFileSync(presets, "utf8").matchAll(/^ {4}"(\w+)": _palette\(/gm)].map((m) => m[1]);
    for (const kind of SHOP_KINDS) {
      expect(palettes, kind).toContain(SUGGESTED_PALETTE[kind]);
    }
  });
});

describe("the words, in both languages", () => {
  test("sign in, sign up, setup and the sample shop say everything in Bangla too", () => {
    for (const ns of ["login", "signup", "checkEmail", "passkey", "showcase", "onboarding"] as const) {
      expect(keys(bn.auth[ns]).sort(), ns).toEqual(keys(en.auth[ns]).sort());
    }
    expect(keys(bn.shopPreview).sort()).toEqual(keys(en.shopPreview).sort());
    expect(keys(bn.dashboard.setupGuide).sort()).toEqual(keys(en.dashboard.setupGuide).sort());
  });

  test("the pages hold no English of their own", () => {
    for (const file of [
      "src/app/[locale]/login/page.tsx",
      "src/app/[locale]/signup/page.tsx",
      "src/app/[locale]/auth/passkey/page.tsx",
    ]) {
      const source = read(file);
      expect(source, file).toContain("useTranslations(");
      expect(source, file).not.toMatch(/>\s*(Welcome back|Create your account|Create a passkey|Sign in with a passkey)\s*</);
      expect(source, file).not.toMatch(/setError\("[A-Z]/);
    }
  });
});

describe("a phone number, as typed after +880", () => {
  test.each([
    ["1712345678", "01712345678"],
    ["01712345678", "01712345678"],
    ["1712-345678", "01712345678"],
    ["+880 1712 345678", "01712345678"],
    ["8801712345678", "01712345678"],
  ])("%s is kept as %s", (typed, kept) => {
    expect(normalizeBdMobile(typed)).toBe(kept);
  });

  test.each(["", "12345", "0271234567", "02712345678"])("%s is not a mobile number", (typed) => {
    expect(normalizeBdMobile(typed)).toBeNull();
  });
});

describe("where an owner goes after signing in", () => {
  const base: MeForRouting = {
    active_store_public_id: "str_1",
    latest_payment_status: null,
    subscription: { subscription_status: "ACTIVE", plan: null, plan_public_id: null, end_date: null, days_remaining: 0 },
  };

  test("no shop: setup", () => {
    expect(resolvePostAuthPath({ ...base, active_store_public_id: null, store: null })).toBe("/onboarding");
  });

  test("a shop setup made and never finished: back to setup", () => {
    const me = { ...base, store: { public_id: "str_1", name: "Rupkotha", role: "Owner", setup_finished: false } };
    expect(resolvePostAuthPath(me)).toBe("/onboarding");
  });

  test("a finished shop, or a member of someone else's: the dashboard", () => {
    expect(resolvePostAuthPath({ ...base, store: { public_id: "str_1", name: "R", role: "Owner", setup_finished: true } })).toBe("/");
    expect(resolvePostAuthPath({ ...base, store: { public_id: "str_1", name: "R", role: "Packer" } })).toBe("/");
  });

  test("the dashboard sends an unfinished owner back too", () => {
    const layout = read("src/app/[locale]/(dashboard)/DashboardLayoutClient.tsx");
    expect(layout).toContain("const setupPending = meReady && meProfile !== null && setupUnfinished(meProfile);");
  });
});

describe("setup", () => {
  const hook = read("src/app/[locale]/onboarding/useSetup.ts");

  test("makes the shop on the name step, and finishes it last", () => {
    expect(hook).toContain('api.post<CreatedStore>("store/", {');
    expect(hook).toContain('api.post("store/setup/finish/", { palette: chosenPalette })');
    expect(hook.indexOf('saveBranding({ phone: mobile, social_links: accounts })')).toBeLessThan(
      hook.indexOf('api.post("store/setup/finish/"')
    );
  });

  test("offers a domain the owner has only where the Domains settings are on", () => {
    expect(hook).toContain('export const DOMAINS_ENABLED = process.env.NEXT_PUBLIC_DOMAINS_ENABLED === "1";');
    expect(read("src/app/[locale]/onboarding/steps.tsx")).toContain("{DOMAINS_ENABLED ? (");
  });

  test("the setup guide sits at the top of the home page", () => {
    expect(read("src/app/[locale]/(dashboard)/page.tsx")).toContain("<HomeSetupGuide />");
  });

  test("moves with CSS only, and not at all for someone who asked for less motion", () => {
    const css = read("src/app/globals.css");
    expect(css).toContain("@media (prefers-reduced-motion: reduce) {\n  .pb-motion,");
    const pkg = JSON.parse(read("package.json")) as { dependencies?: Record<string, string> };
    for (const lib of ["framer-motion", "motion", "gsap"]) {
      expect(pkg.dependencies ?? {}, lib).not.toHaveProperty(lib);
    }
  });
});
