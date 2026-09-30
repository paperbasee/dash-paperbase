/**
 * The fraud colour on orders (owner, 2026-09-30): the badge in the order list and on the order
 * page, and the plain-words advice in the fraud check.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import { FraudBadge, isFraudRiskLevel } from "@/app/[locale]/(dashboard)/orders/_components/FraudBadge";
import { AdvicePanel } from "@/app/[locale]/(dashboard)/orders/_components/FraudCheckDialog";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

function render(node: React.ReactNode, locale: "en" | "bn" = "en") {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : bn}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("the badge", () => {
  test("a ring filled to the share delivered, with what it means and the parcels beside it", () => {
    const html = render(<FraudBadge level="safe" successRatio={96.4} totalParcels={25} />);
    expect(html).toContain(">96%<");
    expect(html).toContain(">Good buyer<");
    expect(html).toContain(">25 parcels<");
    expect(html).toContain("Good buyer: 25 parcels, 96% delivered");
    expect(html).toContain("emerald");
    // The ring's arc is that share of the way round.
    const around = 2 * Math.PI * 20.5;
    expect(html).toContain(`stroke-dasharray="${((96.4 / 100) * around).toString()} ${around.toString()}"`);
  });

  test("red for risky, yellow for caution", () => {
    expect(render(<FraudBadge level="risky" successRatio={40} totalParcels={10} />)).toContain("red");
    expect(render(<FraudBadge level="caution" successRatio={70} totalParcels={10} />)).toContain("amber");
  });

  test("a new customer says so, with an empty ring and no number", () => {
    const html = render(<FraudBadge level="new" successRatio={null} totalParcels={0} />);
    expect(html).toContain(">New buyer<");
    expect(html).toContain(">No parcels yet<");
    expect(html).toContain("No parcels on record yet");
    expect(html).not.toContain("%<");
  });

  test("with a way to open the details it is a button; without, it only tells", () => {
    expect(render(<FraudBadge level="safe" successRatio={90} totalParcels={9} onClick={() => {}} />)).toContain("<button");
    expect(render(<FraudBadge level="safe" successRatio={90} totalParcels={9} />)).not.toContain("<button");
  });

  test("reads in Bangla", () => {
    expect(render(<FraudBadge level="risky" successRatio={40} totalParcels={10} />, "bn")).toContain("ঝুঁকিপূর্ণ");
  });

  test("only the four colours count as checked", () => {
    for (const level of ["safe", "caution", "new", "risky"]) expect(isFraudRiskLevel(level)).toBe(true);
    for (const other of ["", undefined, null, "green"]) expect(isFraudRiskLevel(other)).toBe(false);
  });
});

test("the advice says what to do, in both languages", () => {
  const risky = { level: "risky" as const, success_ratio: 40, total_parcels: 10 };
  expect(render(<AdvicePanel risk={risky} />)).toContain("Call first, or hold this order.");
  expect(render(<AdvicePanel risk={{ level: "safe", success_ratio: 95, total_parcels: 20 }} />)).toContain(
    "You can send this order.",
  );
  expect(render(<AdvicePanel risk={risky} />, "bn")).toContain("আটকে রাখুন");
  for (const key of ["riskSafe", "riskCaution", "riskNew", "riskRisky", "adviceSafe", "adviceCaution", "adviceNew", "adviceRisky", "riskParcels", "riskNoParcels"]) {
    expect((bn.fraudCheck as Record<string, string>)[key], key).toBeTruthy();
  }
});
