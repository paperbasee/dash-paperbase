"use client";

import { Check, Fingerprint, Truck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { ScaleToFit } from "@/components/shop-preview/ScaleToFit";
import { ShopWindow } from "@/components/shop-preview/ShopWindow";
import { SAMPLE_PRICES, formatTaka, productPhoto, type ShopKind } from "@/components/shop-preview/samples";
import { cn } from "@/lib/utils";

/**
 * The picture beside sign in and sign up (owner, 2026-09-28): a real-looking shop and what running
 * it feels like -- orders arriving, the day's sales climbing, a parcel booked. Made of the sample
 * shop's photos and words; nothing here is anyone's real shop.
 */

const ORDERS = [
  { number: 1042, amount: 2450, who: "order1Name", city: "order1City", initials: "NJ" },
  { number: 1043, amount: 1890, who: "order2Name", city: "order2City", initials: "RA" },
  { number: 1044, amount: 3200, who: "order3Name", city: "order3City", initials: "SK" },
] as const;

const OPENING_SALES = 48250;

function prefersLessMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A card that rises in after `delay` ms, then drifts. Two boxes, so the two motions don't fight. */
function Floating({
  className,
  delay,
  low = false,
  children,
}: {
  className: string;
  delay: number;
  low?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("pb-rise absolute z-10", className)} style={{ animationDelay: `${delay}ms` }}>
      <div className={low ? "pb-float-low" : "pb-float"}>{children}</div>
    </div>
  );
}

const CARD =
  "rounded-card bg-white px-4 py-3.5 text-[#0f172a] shadow-[0_1px_0_rgb(15_23_42/0.03),0_18px_40px_-16px_rgb(15_23_42/0.3)] ring-1 ring-black/[0.06]";

function SignInScene() {
  const t = useTranslations("auth.showcase");
  const tShop = useTranslations("shopPreview");
  const locale = useLocale();
  const [sales, setSales] = useState(0);
  const [orderIndex, setOrderIndex] = useState(0);
  const [swapping, setSwapping] = useState(false);
  const [courierShown, setCourierShown] = useState(false);

  // The day's sales count up once, then each new order adds to them.
  useEffect(() => {
    if (prefersLessMotion()) {
      setSales(OPENING_SALES);
      setCourierShown(true);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1400);
      setSales(Math.round(OPENING_SALES * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const timers: number[] = [window.setTimeout(() => setCourierShown(true), 1900)];
    let index = 0;
    let total = OPENING_SALES;
    const cycle = window.setInterval(() => {
      setSwapping(true);
      setCourierShown(false);
      timers.push(
        window.setTimeout(() => {
          index = (index + 1) % ORDERS.length;
          total += ORDERS[index].amount;
          setOrderIndex(index);
          setSales(total);
          setSwapping(false);
          timers.push(window.setTimeout(() => setCourierShown(true), 1100));
        }, 380)
      );
    }, 4800);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(cycle);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const order = ORDERS[orderIndex];
  const swap = cn("transition-[opacity,transform] duration-300", swapping && "translate-y-1.5 opacity-0");

  return (
    <div className="relative h-[540px] w-[600px]">
      <div className="pb-rise absolute left-5 top-10 origin-top-left scale-[0.86]" style={{ animationDelay: "100ms" }}>
        <ShopWindow
          name="Rupkotha"
          hostname="rupkotha.paperbase.me"
          kind="clothing"
          announcement={tShop("cashOnDelivery")}
        />
      </div>

      <Floating className="right-0 top-0 w-[214px]" delay={450}>
        <div className={CARD}>
          <div className="flex items-center justify-between text-[11px] text-[#64748b]">
            {t("todaysSales")}
            <span className="rounded-xs bg-[#ecfdf3] px-1.5 py-px font-medium text-[#15803d]">▲ 18%</span>
          </div>
          <p className="mt-0.5 text-[22px] font-semibold tracking-[-0.02em] tabular-nums">{formatTaka(sales, locale)}</p>
          <svg className="mt-2 block" width="182" height="40" viewBox="0 0 182 40" aria-hidden>
            <defs>
              <linearGradient id="pb-spark" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#15803d" stopOpacity="0.18" />
                <stop offset="1" stopColor="#15803d" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              className="pb-rise"
              style={{ animationDelay: "1.8s" }}
              d="M0 34 L20 30 L40 32 L60 22 L80 25 L100 16 L120 19 L140 10 L160 12 L182 4 L182 40 L0 40Z"
              fill="url(#pb-spark)"
            />
            <path
              className="pb-draw"
              d="M0 34 L20 30 L40 32 L60 22 L80 25 L100 16 L120 19 L140 10 L160 12 L182 4"
              fill="none"
              stroke="#15803d"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </Floating>

      <Floating className="bottom-16 left-0 w-[300px]" delay={700} low>
        <div className={cn(CARD, "flex items-center gap-3")}>
          <span
            className={cn(
              swap,
              "flex size-9 shrink-0 items-center justify-center rounded-full bg-[#ece6da] text-xs font-semibold text-[#6b5d45]"
            )}
          >
            {order.initials}
          </span>
          <div className={cn(swap, "min-w-0 flex-1")}>
            <p className="text-[12.5px] font-semibold">{t("newOrder", { number: order.number })}</p>
            <p className="truncate text-[11px] text-[#64748b]">
              {t(order.who)} · {t(order.city)} · {formatTaka(order.amount, locale)}
            </p>
          </div>
          <span className="rounded-xs bg-[#0f172a] px-1.5 py-0.5 text-[9.5px] font-semibold tracking-[0.03em] text-white">
            {t("cod")}
          </span>
        </div>
      </Floating>

      <div
        className={cn(
          CARD,
          "absolute bottom-[170px] right-1 z-10 flex items-center gap-2 px-3 py-2.5 text-[11.5px] font-medium transition-[opacity,transform] duration-500",
          courierShown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        )}
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-[#ecfdf3] text-[#15803d]">
          <Truck className="size-3.5" aria-hidden />
        </span>
        {t("courierBooked")}
      </div>
    </div>
  );
}

const FAN: readonly { kind: ShopKind; n: 1 | 2 | 3; place: string; lift: string }[] = [
  { kind: "beauty", n: 1, place: "left-[30px] top-[70px] -rotate-[7deg]", lift: "group-hover:-rotate-[10deg] group-hover:-translate-x-3" },
  { kind: "clothing", n: 2, place: "left-[180px] top-[30px] z-[2]", lift: "" },
  { kind: "home", n: 1, place: "left-[330px] top-[70px] rotate-[7deg]", lift: "group-hover:rotate-[10deg] group-hover:translate-x-3" },
];

function SignUpScene() {
  const t = useTranslations("auth.showcase");
  const tShop = useTranslations("shopPreview");
  const locale = useLocale();
  const [done, setDone] = useState(0);

  // The three steps tick one after another, then start again.
  useEffect(() => {
    if (prefersLessMotion()) {
      setDone(3);
      return;
    }
    const timers: number[] = [];
    const run = () => {
      setDone(0);
      [1, 2, 3].forEach((step) => timers.push(window.setTimeout(() => setDone(step), 600 + step * 1100)));
    };
    run();
    const loop = window.setInterval(run, 6200);
    return () => {
      window.clearInterval(loop);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <div className="group relative h-[480px] w-[560px]">
      {FAN.map(({ kind, n, place, lift }, i) => (
        <div
          key={`${kind}-${n}`}
          className={cn(
            "pb-rise absolute w-[200px] overflow-hidden rounded-card bg-white shadow-[0_30px_60px_-24px_rgb(15_23_42/0.4)] ring-1 ring-black/[0.06] transition-transform duration-700",
            place,
            lift
          )}
          style={{ animationDelay: `${100 + i * 120}ms` }}
        >
          <div className="h-[250px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- a fixed, pre-sized sample photo */}
            <img src={productPhoto(kind, n)} alt="" className="pb-drift size-full object-cover" decoding="async" />
          </div>
          <div className="flex justify-between gap-2 px-3 py-2.5 text-[11.5px] text-[#0f172a]">
            <span className="truncate">{tShop(`kinds.${kind}.item${n}`)}</span>
            <b className="font-semibold">{formatTaka(SAMPLE_PRICES[kind][n - 1], locale)}</b>
          </div>
        </div>
      ))}

      <Floating className="right-0 top-0" delay={500}>
        <div className={cn(CARD, "flex items-center gap-2.5 text-xs font-medium")}>
          <span className="flex size-[30px] items-center justify-center rounded-full bg-[#0f172a] text-white">
            <Fingerprint className="size-4" aria-hidden />
          </span>
          <span>
            {t("passkeyTitle")}
            <span className="block text-[10.5px] font-normal text-[#64748b]">{t("passkeyBody")}</span>
          </span>
        </div>
      </Floating>

      <Floating className="bottom-0 left-2.5 w-[256px]" delay={650} low>
        <div className={CARD}>
          <p className="mb-2.5 text-[12.5px] font-semibold">{t("stepsTitle")}</p>
          {(["step1", "step2", "step3"] as const).map((key, i) => {
            const state = i < done ? "done" : i === done ? "now" : "todo";
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-2.5 py-1 text-xs transition-colors duration-300",
                  state === "done" ? "text-[#0f172a]" : "text-[#64748b]"
                )}
              >
                <span
                  className={cn(
                    "flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-300",
                    state === "done" && "pb-pop border-[#0f172a] bg-[#0f172a] text-white",
                    state === "now" && "animate-spin border-[#e5e7eb] border-t-[#0f172a]",
                    state === "todo" && "border-[#e5e7eb]"
                  )}
                >
                  {state === "done" ? <Check className="size-3" aria-hidden /> : null}
                </span>
                {t(key)}
              </div>
            );
          })}
        </div>
      </Floating>
    </div>
  );
}

export function AuthShowcase({ variant }: { variant: "signin" | "signup" }) {
  const t = useTranslations("auth.showcase");
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-card bg-[#f3f1ec] dark:bg-muted" aria-hidden>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_20%,rgb(255_255_255/0.9),transparent_70%),radial-gradient(50%_50%_at_10%_90%,rgb(226_220_208/0.8),transparent_70%)] dark:opacity-10" />
      <div className="relative min-h-0 flex-1 px-10 pt-12">
        <ScaleToFit width={variant === "signin" ? 600 : 560} mode="contain">
          {variant === "signin" ? <SignInScene /> : <SignUpScene />}
        </ScaleToFit>
      </div>
      <div className="relative px-8 pb-12 pt-6 text-center">
        <p className="text-[17px] font-semibold tracking-[-0.01em] text-[#161514] dark:text-foreground">
          {t(variant === "signin" ? "signinTitle" : "signupTitle")}
        </p>
        <p className="mt-1 text-[13px] text-[#6b665e] dark:text-muted-foreground">
          {t(variant === "signin" ? "signinBody" : "signupBody")}
        </p>
      </div>
    </div>
  );
}
