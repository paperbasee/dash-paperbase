/**
 * An order's fraud report is kept (owner, 2026-09-30: "save to db so that when merchants click this
 * will immediately show the report"; "keep reports forever"): opening it asks nobody, the dialog says
 * when it was checked, and "Check again" asks the provider anew.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";

import { CheckedBar } from "@/app/[locale]/(dashboard)/orders/_components/FraudCheckDialog";
import { errorStatus, loadFraudCheck } from "@/app/[locale]/(dashboard)/orders/_components/fraudCheckApi";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

const NOW = new Date("2026-09-30T12:00:00Z");

function render(node: React.ReactNode, locale: "en" | "bn" = "en") {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : bn} now={NOW} timeZone="Asia/Dhaka">
      {node}
    </NextIntlClientProvider>,
  );
}

describe("when it was checked, and Check again", () => {
  const threeHoursAgo = "2026-09-30T09:00:00Z";

  test("says how long ago, with a button to ask again", () => {
    const html = render(<CheckedBar checkedAt={threeHoursAgo} onCheckAgain={() => {}} />);
    expect(html).toContain("Checked 3 hours ago");
    expect(html).toContain(`dateTime="2026-09-30T09:00:00.000Z"`);
    expect(html).toContain(">Check again<");
  });

  test("while it asks, the button says so and waits", () => {
    const html = render(<CheckedBar checkedAt={threeHoursAgo} onCheckAgain={() => {}} checkingAgain />);
    expect(html).toContain("Checking…");
    expect(html).toContain("disabled");
    expect(html).toContain("animate-spin");
  });

  test("no button for a member who may not run checks", () => {
    const html = render(<CheckedBar checkedAt={threeHoursAgo} />);
    expect(html).toContain("Checked 3 hours ago");
    expect(html).not.toContain("<button");
  });

  test("nothing at all when there is neither", () => {
    expect(render(<CheckedBar />)).toBe("");
  });

  test("reads in Bangla", () => {
    const html = render(<CheckedBar checkedAt={threeHoursAgo} onCheckAgain={() => {}} />, "bn");
    expect(html).toContain("যাচাই করা হয়েছে");
    expect(html).toContain("আবার যাচাই করুন");
  });
});

describe("opening an order's check", () => {
  const order = { public_id: "ord_1", phone: "01712345678", fraud_report: true };
  const report = { cached: true, status: "success", checked_at: "2026-09-30T09:00:00Z" };

  function client({ get, post }: { get?: unknown; post?: unknown } = {}) {
    return {
      get: vi.fn(async () => {
        if (get instanceof Error) throw get;
        return { data: get ?? report };
      }),
      post: vi.fn(async () => ({ data: post ?? { status: "success" } })),
    };
  }

  function notFound() {
    return Object.assign(new Error("404"), { response: { status: 404 } });
  }

  test("a kept report opens without a check", async () => {
    const api = client();
    expect(await loadFraudCheck(api as never, order, { fresh: false, canCheck: true })).toEqual(report);
    expect(api.get).toHaveBeenCalledWith("fraud-check/orders/ord_1/");
    expect(api.post).not.toHaveBeenCalled();
  });

  test("an order with no report is checked", async () => {
    const api = client();
    await loadFraudCheck(api as never, { ...order, fraud_report: false }, { fresh: false, canCheck: true });
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledWith("fraud-check/", { phone: "01712345678", order: "ord_1" });
  });

  test("Check again asks the provider anew", async () => {
    const api = client();
    await loadFraudCheck(api as never, order, { fresh: true, canCheck: true });
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledWith("fraud-check/", { phone: "01712345678", order: "ord_1", fresh: true });
  });

  test("a report gone missing is checked by a member who may, never by one who may not", async () => {
    const api = client({ get: notFound() });
    await loadFraudCheck(api as never, order, { fresh: false, canCheck: true });
    expect(api.post).toHaveBeenCalledOnce();
    const viewer = client({ get: notFound() });
    await expect(loadFraudCheck(viewer as never, order, { fresh: false, canCheck: false })).rejects.toThrow("404");
    expect(viewer.post).not.toHaveBeenCalled();
  });

  test("a failed request's status is read", () => {
    expect(errorStatus(notFound())).toBe(404);
    expect(errorStatus(new Error("offline"))).toBeUndefined();
  });
});
