import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import type { FraudRiskLevel } from "../../_components/types";
import { LEVEL_TEXT } from "../_lib/tones";
import { DeliveryRing } from "./DeliveryRing";

/** Each colour with a share that sits inside it, so the small rings read like the real one. */
const GUIDE: readonly { level: FraudRiskLevel; pct: number; name: string; rule: string }[] = [
  { level: "safe", pct: 92, name: "riskSafe", rule: "guideSafe" },
  { level: "caution", pct: 70, name: "riskCaution", rule: "guideCaution" },
  { level: "risky", pct: 38, name: "riskRisky", rule: "guideRisky" },
  { level: "new", pct: 0, name: "riskNew", rule: "guideNew" },
];

/** Before any check: what each colour means, on risk.py's lines (`SAFE_FROM`, `RISKY_BELOW`). */
export function ColourGuide() {
  const t = useTranslations("fraudCheckPage");
  const tRisk = useTranslations("fraudCheck");
  return (
    <section className="rounded-card border border-card-border bg-card p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">{t("guideTitle")}</h2>
      <ul className="mt-4 grid grid-cols-1 gap-x-7 gap-y-4 @min-[36rem]:grid-cols-2 @min-[64rem]:grid-cols-4">
        {GUIDE.map(({ level, pct, name, rule }) => (
          <li key={level} className="flex items-center gap-3.5">
            <DeliveryRing level={level} deliveredPct={pct} className="size-10" />
            <div className="min-w-0">
              <div className={cn("text-sm font-semibold", LEVEL_TEXT[level])}>{tRisk(name)}</div>
              <div className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{t(rule)}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
