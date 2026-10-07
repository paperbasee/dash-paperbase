/**
 * The account menu (owner, 2026-10-07: "A with C's What's new"): What's new says how many updates
 * are waiting, "9+" past nine, or that you're up to date, in English and Bangla.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";

import { UNREAD_SHOWN_MAX, unreadLine } from "@/lib/whats-new/unread";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

const say = (locale: "en" | "bn", count: number) => {
  const t = createTranslator({ locale, messages: locale === "en" ? en : bn, namespace: "whatsNew" });
  const line = unreadLine(count);
  return t(line.key, line.values as Record<string, number>);
};

describe("the What's new line in the account menu", () => {
  it("counts what is waiting", () => {
    expect(say("en", 1)).toBe("1 new update");
    expect(say("en", 2)).toBe("2 new updates");
    expect(say("bn", 2)).toBe("২টি নতুন আপডেট");
  });

  it("stops at 9+ so a newcomer's whole history is not a number", () => {
    expect(UNREAD_SHOWN_MAX).toBe(9);
    expect(say("en", 9)).toBe("9 new updates");
    expect(say("en", 30)).toBe("9+ new updates");
    expect(say("bn", 30)).toBe("৯+ নতুন আপডেট");
  });

  it("says when nothing is waiting", () => {
    expect(say("en", 0)).toBe("You're up to date");
    expect(say("bn", 0)).toBe("সব দেখা হয়েছে");
  });

  it("is what the account menu draws", () => {
    const sidebar = readFileSync(path.join(__dirname, "../../src/components/Sidebar.tsx"), "utf8");
    expect(sidebar).toContain("<UserMenuBody");
    expect(sidebar).toContain("unreadCount={whatsNewUnreadCount}");
  });
});
