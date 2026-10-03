/**
 * The sidebar's Add new menu (owner, 2026-10-03): each item where the dashboard adds it, shown
 * only where its app shows and to a role the API lets add it.
 */
import { describe, expect, it } from "vitest";

import { APP_CONFIG } from "@/config/apps";
import { QUICK_CREATE_ITEMS, quickCreateItems } from "@/config/quick-create";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

const ids = (items: { id: string }[]) => items.map((item) => item.id);
const every = () => true;

describe("the Add new menu", () => {
  it("lists order, product, category, discount code, blog post and review, in that order", () => {
    expect(ids(quickCreateItems(every, every))).toEqual(["order", "product", "category", "coupon", "blogPost", "review"]);
  });

  it("opens each one's new page, or its list with the add form open", () => {
    const hrefs = Object.fromEntries(QUICK_CREATE_ITEMS.map((item) => [item.id, item.href]));
    expect(hrefs).toEqual({
      order: "/orders/new",
      product: "/products/new",
      category: "/categories?open=new",
      coupon: "/coupons?open=new",
      blogPost: "/blog/new",
      review: "/reviews?open=new",
    });
  });

  it("shows an item only where its app shows and to a role that may add it", () => {
    const staff = (key: string) => key === "orders.edit" || key === "products.view";
    expect(ids(quickCreateItems(every, staff))).toEqual(["order"]);
    const couponsOff = (appId: string) => appId !== "coupons";
    expect(ids(quickCreateItems(couponsOff, every))).not.toContain("coupon");
    expect(quickCreateItems(every, () => false)).toEqual([]);
  });

  it("every item has its app's icon and words in both languages", () => {
    for (const item of QUICK_CREATE_ITEMS) {
      expect(APP_CONFIG[item.appId]?.icon, item.appId).toBeTruthy();
      for (const messages of [en, bn]) {
        expect((messages.sidebar as Record<string, string>)[`addNew_${item.id}`], item.id).toBeTruthy();
      }
    }
    expect(en.sidebar.addNew).toBe("Add new");
    expect(bn.sidebar.addNew).toBeTruthy();
  });
});
