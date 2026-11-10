/**
 * The Fraud check page (owner, 2026-11-10): any phone number, not only an order's, on a page of its
 * own design -- the verdict first, then each courier, other merchants' reports and Paperbase's own
 * history. The order list's pop-up is its own and is not touched by any of this.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";

import { ColourGuide } from "@/app/[locale]/(dashboard)/orders/fraud-check/_components/ColourGuide";
import { CourierBars } from "@/app/[locale]/(dashboard)/orders/fraud-check/_components/CourierBars";
import { MerchantReports } from "@/app/[locale]/(dashboard)/orders/fraud-check/_components/MerchantReports";
import { PaperbaseHistory } from "@/app/[locale]/(dashboard)/orders/fraud-check/_components/PaperbaseHistory";
import { VerdictBand } from "@/app/[locale]/(dashboard)/orders/fraud-check/_components/VerdictBand";
import {
  RISKY_BELOW,
  SAFE_FROM,
  checkPhone,
  checkProblem,
  readReport,
  shownPhone,
  toneOf,
} from "@/app/[locale]/(dashboard)/orders/fraud-check/_lib/report";
import { ApiHttpError, ApiTransportError } from "@/lib/api-client";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

const NOW = new Date("2026-11-10T12:00:00Z");

function render(node: React.ReactNode, locale: "en" | "bn" = "en") {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : bn} now={NOW} timeZone="Asia/Dhaka">
      {node}
    </NextIntlClientProvider>,
  );
}

// The answer as the API keeps it (engine/apps/fraud_check/bdcourier_client.normalize_bdcourier_response).
const ANSWER = {
  provider: "bdcourier",
  summary: { total_parcel: 25, success_parcel: 24, cancelled_parcel: 1, success_ratio: 96 },
  couriers: {
    Paperfly: { name: "Paperfly", logo: "", success_ratio: 100, total: 4, success: 4, cancelled: 0 },
    Pathao: { name: "Pathao", logo: "https://example.test/pathao.png", success_ratio: 100, total: 12, success: 12, cancelled: 0 },
    Steadfast: { name: "Steadfast", logo: "", success_ratio: 88.89, total: 9, success: 8, cancelled: 1 },
  },
  reports: [
    { details: "Did not pick up the phone on delivery day", courier: "Steadfast", reported_at: "2026-08-14T10:00:00Z" },
    { details: "   ", courier: "RedX", reported_at: "" },
  ],
  raw: {},
};

describe("reading the answer", () => {
  test("counts, a row per courier busiest first, and the reports that say something", () => {
    const report = readReport(ANSWER);
    expect(report.summary).toEqual({ total: 25, delivered: 24, cancelled: 1 });
    expect(report.couriers.map((c) => c.name)).toEqual(["Pathao", "Steadfast", "Paperfly"]);
    expect(report.couriers[1]).toMatchObject({ total: 9, delivered: 8, cancelled: 1, deliveredPct: 88.9 });
    expect(report.couriers[0].logo).toBe("https://example.test/pathao.png");
    expect(report.reports).toEqual([
      { details: "Did not pick up the phone on delivery day", courier: "Steadfast", reportedAt: "2026-08-14T10:00:00Z" },
    ]);
  });

  test("a failed check's answer, or none, reads as nothing rather than breaking", () => {
    const empty = { summary: { total: 0, delivered: 0, cancelled: 0 }, couriers: [], reports: [] };
    expect(readReport({ error: "Request timed out" })).toEqual(empty);
    expect(readReport(null)).toEqual(empty);
    expect(readReport({ couriers: { RedX: { name: "RedX", total: 0, success: 0 } } }).couriers).toEqual([]);
  });

  test("a local number is shown as Bangladesh writes it, anything else as typed", () => {
    expect(shownPhone("01700000142")).toBe("01700-000142");
    expect(shownPhone(" 01700 000-142 ")).toBe("01700-000142");
    expect(shownPhone("+8801700000142")).toBe("+8801700000142");
  });

  test("a courier's share takes the verdict's colours, on risk.py's lines", () => {
    expect([SAFE_FROM, RISKY_BELOW]).toEqual([80, 60]);
    expect(toneOf(80)).toBe("safe");
    expect(toneOf(79.9)).toBe("caution");
    expect(toneOf(60)).toBe("caution");
    expect(toneOf(59.9)).toBe("risky");
  });
});

describe("asking", () => {
  test("a check sends the number as typed; Check again asks the provider anew", async () => {
    const post = vi.fn(async () => ({ data: { status: "success" } }));
    await checkPhone({ post } as never, "01700000142", false);
    await checkPhone({ post } as never, "01700000142", true);
    expect(post).toHaveBeenNthCalledWith(1, "fraud-check/", { phone: "01700000142" });
    expect(post).toHaveBeenNthCalledWith(2, "fraud-check/", { phone: "01700000142", fresh: true });
  });

  test("each refusal is told in the merchant's words", () => {
    expect(checkProblem(new ApiHttpError("bad", 400, { phone: ["Phone number must be exactly 11 digits."] }))).toBe("errorPhone");
    expect(checkProblem(new ApiHttpError("limit", 429, {}))).toBe("errorLimit");
    expect(checkProblem(new ApiHttpError("busy", 409, {}))).toBe("errorBusy");
    expect(checkProblem(new ApiHttpError("down", 502, {}))).toBe("errorFailed");
    expect(checkProblem(new ApiTransportError("offline"))).toBe("errorFailed");
    expect(en.fraudCheckPage.errorPhone).toBe("Type an 11-digit number that starts with 01.");
  });
});

describe("the verdict band", () => {
  const band = (props: Partial<React.ComponentProps<typeof VerdictBand>> = {}, locale: "en" | "bn" = "en") =>
    render(
      <VerdictBand
        risk={{ level: "safe", success_ratio: 96, total_parcels: 25 }}
        phone="01700-000142"
        summary={{ total: 25, delivered: 24, cancelled: 1 }}
        checkedAt="2026-11-10T11:59:30Z"
        onCheckAgain={() => {}}
        checkingAgain={false}
        numberClass="font-numbers"
        {...props}
      />,
      locale,
    );

  test("says the verdict first: the share, the name, the number, what to do and the parcels", () => {
    const html = band();
    expect(html).toContain(">96%<");
    expect(html).toContain("Good buyer");
    expect(html).toContain("01700-000142");
    expect(html).toContain("You can send this order.");
    expect(html).toContain(">25<");
    expect(html).toContain(">24<");
    expect(html).toContain("Total parcels");
    expect(html).toContain("Check again");
    expect(html).toContain("text-emerald-500");
  });

  test("a risky number turns the band red", () => {
    const html = band({ risk: { level: "risky", success_ratio: 33.3, total_parcels: 9 } });
    expect(html).toContain("Risky");
    expect(html).toContain(">33%<");
    expect(html).toContain("border-red-600/30");
  });

  test("a new number shows its parcel count in a dashed ring and no row of zeros", () => {
    const html = band({ risk: { level: "new", success_ratio: null, total_parcels: 0 }, summary: { total: 0, delivered: 0, cancelled: 0 } });
    expect(html).toContain("New buyer");
    expect(html).toContain(">0<");
    expect(html).toContain(">parcels<");
    expect(html).toContain('stroke-dasharray="4 6"');
    expect(html).not.toContain("Total parcels");
  });

  test("while it asks again the button says so and waits", () => {
    const html = band({ checkingAgain: true });
    expect(html).toContain("Checking…");
    expect(html).toContain("disabled");
  });

  test("in Bangla", () => {
    const html = band({}, "bn");
    expect(html).toContain("ভালো ক্রেতা");
    expect(html).toContain("মোট পার্সেল");
    expect(html).toContain("আবার যাচাই করুন");
  });
});

describe("the couriers", () => {
  const couriers = readReport(ANSWER).couriers;

  test("each courier as a bar, its counts in words and its share in its colour", () => {
    const html = render(<CourierBars couriers={couriers} numberClass="font-numbers" />);
    expect(html).toContain("By courier");
    expect(html).toContain("12 of 12 delivered<");
    expect(html).toContain("8 of 9 delivered, 1 cancelled");
    expect(html).toContain("88.9%");
    expect(html).toContain('title="Pathao"');
  });

  test("in Bangla", () => {
    const html = render(<CourierBars couriers={couriers} numberClass="font-sans tabular-nums" />, "bn");
    expect(html).toContain("কুরিয়ার অনুযায়ী");
    // Every count in one kind of digit, as the pop-up's Bangla counts are.
    expect(html).toContain("9টির মধ্যে 8টি ডেলিভার, 1টি বাতিল");
  });

  test("no courier has carried a parcel to the number", () => {
    expect(render(<CourierBars couriers={[]} numberClass="font-numbers" />)).toContain(
      "No courier has a parcel for this number yet.",
    );
  });
});

describe("reports and history", () => {
  test("other merchants' reports, with the courier and the day", () => {
    const html = render(<MerchantReports reports={readReport(ANSWER).reports} />);
    expect(html).toContain("1 report from other merchants");
    expect(html).toContain("Did not pick up the phone on delivery day");
    expect(html).toContain("Steadfast, 14-08-2026");
  });

  test("nobody reported the number", () => {
    expect(render(<MerchantReports reports={[]} />)).toContain("No merchant has reported this number.");
  });

  test("Paperbase's own counts, or that it has none", () => {
    const html = render(<PaperbaseHistory history={{ delivered: 6, returned: 0, wrong_number_shops: 2 }} numberClass="font-numbers" />);
    expect(html).toContain("Paperbase history");
    expect(html).toContain(">6<");
    expect(html).toContain("2 shops");
    expect(
      render(<PaperbaseHistory history={{ delivered: 0, returned: 0, wrong_number_shops: 0 }} numberClass="font-numbers" />),
    ).toContain("No parcels to this number on Paperbase yet.");
  });
});

describe("before a check", () => {
  test("the colours are explained on the verdict's lines, in both languages", () => {
    const html = render(<ColourGuide />);
    for (const words of ["What the colours mean", "Good buyer", "80% or more delivered", "Be careful", "Risky", "New buyer"]) {
      expect(html).toContain(words);
    }
    expect(render(<ColourGuide />, "bn")).toContain("রংগুলোর মানে");
  });
});
