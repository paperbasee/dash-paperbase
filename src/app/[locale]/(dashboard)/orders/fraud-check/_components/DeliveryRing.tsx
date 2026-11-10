import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { FraudRiskLevel } from "../../_components/types";
import { LEVEL_RING } from "../_lib/tones";

const VIEW = 100;
const RADIUS = 44;
const STROKE = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The delivered share as an arc in the verdict's colour, over a faint track and wash of it; a
 * number with no parcels is a dashed empty ring, as its badge in the order list is. Sized by
 * `className`, so one drawing serves the verdict and the colour guide.
 */
export function DeliveryRing({
  level,
  deliveredPct,
  className,
  children,
}: {
  level: FraudRiskLevel;
  /** 0-100; not drawn for a new number. */
  deliveredPct: number;
  className?: string;
  /** What sits inside: the share, or the parcel count. */
  children?: ReactNode;
}) {
  const share = Math.max(0, Math.min(100, deliveredPct));
  return (
    <div className={cn("relative shrink-0", LEVEL_RING[level], className)}>
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="block size-full" aria-hidden>
        <circle cx={VIEW / 2} cy={VIEW / 2} r={RADIUS} fill="currentColor" fillOpacity={0.08} />
        {level === "new" ? (
          <circle
            cx={VIEW / 2}
            cy={VIEW / 2}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.6}
            strokeWidth={STROKE / 2}
            strokeDasharray="4 6"
          />
        ) : (
          <>
            <circle
              cx={VIEW / 2}
              cy={VIEW / 2}
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.18}
              strokeWidth={STROKE}
            />
            {share > 0 ? (
              <circle
                cx={VIEW / 2}
                cy={VIEW / 2}
                r={RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={`${(CIRCUMFERENCE * share) / 100} ${CIRCUMFERENCE}`}
                transform={`rotate(-90 ${VIEW / 2} ${VIEW / 2})`}
              />
            ) : null}
          </>
        )}
      </svg>
      {children ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground">{children}</div>
      ) : null}
    </div>
  );
}
