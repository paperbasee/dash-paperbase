import { describe, expect, it } from "vitest";

import { APP_PAGE_PERMISSION } from "@/config/permissions";
import { pageRule } from "@/lib/page-access";
import { THEME_EDITOR_HREF } from "@/lib/theme-editor/access";

describe("pageRule -- what an address needs", () => {
  it("belongs to the app whose page it sits under, the longest match", () => {
    expect(pageRule("/products")).toEqual({ appId: "products", key: undefined });
    expect(pageRule("/products/prd_1/")).toEqual({ appId: "products", key: undefined });
    expect(pageRule("/products/wished").appId).toBe("wishlist");
    expect(pageRule("/orders/abandoned").appId).toBe("abandoned_checkouts");
    expect(pageRule("/customers/accounts").appId).toBe("accounts");
    expect(pageRule("/inventory").appId).toBe("inventory");
  });

  it("asks more of an address that adds or changes something", () => {
    expect(pageRule("/products/new")).toEqual({ appId: "products", key: "products.create" });
    expect(pageRule("/products/prd_1/edit")).toEqual({ appId: "products", key: "products.edit" });
    expect(pageRule("/orders/new").key).toBe("orders.edit");
  });

  it("gates the pages that are no app", () => {
    expect(pageRule("/activities").key).toBe("activity.view");
    expect(pageRule(THEME_EDITOR_HREF).key).toBe("theming.manage");
  });

  it("leaves home, settings and anything unknown to their own rules", () => {
    expect(pageRule("/")).toEqual({ appId: undefined, key: undefined });
    expect(pageRule("/settings")).toEqual({ appId: undefined, key: undefined });
    expect(pageRule("/productsx")).toEqual({ appId: undefined, key: undefined });
  });

  it("every app it can name is gated", () => {
    for (const path of ["/products", "/orders", "/customers", "/inventory", "/trash", "/coupons", "/blog", "/brands", "/reviews", "/categories", "/variants", "/product-attributes", "/support-tickets", "/analytics"]) {
      const { appId } = pageRule(path);
      expect(appId && APP_PAGE_PERMISSION[appId], path).toBeTruthy();
    }
  });
});
