"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Link2, MapPin, Package, Truck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { SocialMark } from "@/components/SocialMark";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { Link } from "@/i18n/navigation";
import { toLocaleDigits } from "@/lib/locale-digits";
import { setupGuideQueryKey } from "@/lib/query-keys";
import {
  SETUP_GUIDE_HREF,
  fetchSetupGuide,
  hideSetupGuide,
  type SetupGuide,
  type SetupGuideStepKey,
} from "@/lib/setup-guide";
import { cn } from "@/lib/utils";

type TileStep = Exclude<SetupGuideStepKey, "shop">;

/** Each step's mark: what it is about, a place's own logo where the step is that place's. */
function StepIcon({ step }: { step: TileStep }) {
  const className = "size-[17px]";
  switch (step) {
    case "product":
      return <Package className={className} aria-hidden />;
    case "delivery":
      return <Truck className={className} aria-hidden />;
    case "courier":
      return <Link2 className={className} aria-hidden />;
    case "facebook_pixel":
      return <SocialMark platform="facebook" className={className} />;
    case "instagram":
      return <SocialMark platform="instagram" className={className} />;
    case "tiktok_pixel":
      return <SocialMark platform="tiktok" className={className} />;
    case "address":
      return <MapPin className={className} aria-hidden />;
  }
}

/**
 * The setup guide (owner, 2026-09-28; a strip since 2026-11-26, the owner's pick of three): the last
 * screen of setup, and the top of the home page until every step is done or the owner skips it.
 * One slim row of tiles, the next step dark, each a way straight to where it is done; the steps done
 * follow, greyed (owner, 2026-09-29: what is left comes first). Making the shop is said in the
 * header, as setup did it. Where the row has no room -- setup's column, a phone -- it slides sideways.
 */
export function SetupGuideCard({
  guide,
  onSkip,
  skipping = false,
  className,
}: {
  guide: SetupGuide;
  onSkip?: () => void;
  skipping?: boolean;
  className?: string;
}) {
  const t = useTranslations("dashboard.setupGuide");
  const locale = useLocale();
  // Creating the shop is always behind the owner here: setup did it.
  const isDone = (step: SetupGuide["steps"][number]) => step.done || step.key === "shop";
  const done = guide.steps.filter(isDone).length;
  const total = guide.steps.length;
  const tiles = guide.steps.filter((step): step is { key: TileStep; done: boolean } => step.key !== "shop");
  const open = tiles.filter((step) => !step.done);
  const finished = tiles.filter((step) => step.done);

  return (
    <section className={cn("rounded-card border border-border-subtle bg-card px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5", className)}>
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
          <span className="text-xs text-muted-foreground">{toLocaleDigits(t("progress", { done, total }), locale)}</span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="size-3 text-[hsl(var(--accent-green))]" strokeWidth={3} aria-hidden />
            {t("shopCreated")}
          </span>
        </div>
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            disabled={skipping}
            className="shrink-0 rounded-ui px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            {t("skip")}
          </button>
        ) : null}
      </header>
      <div className="mt-3.5 flex gap-1" aria-hidden>
        {guide.steps.map((step, i) => (
          <span
            key={step.key}
            data-segment={i < done ? "done" : "open"}
            className={cn(
              "h-[5px] flex-1 rounded-full transition-colors duration-700",
              i < done ? "bg-[hsl(var(--accent-green))]" : "bg-muted"
            )}
          />
        ))}
      </div>
      <ol className="-mx-1 mt-3.5 grid auto-cols-[minmax(10.5rem,1fr)] grid-flow-col gap-3 overflow-x-auto px-1 pb-1">
        {open.map(({ key }, i) => {
          const next = i === 0;
          return (
            <li key={key} className="flex">
              <Link
                href={SETUP_GUIDE_HREF[key]}
                className={cn(
                  "group flex w-full flex-col gap-2 rounded-card p-3.5 transition-colors",
                  next
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "border border-border-subtle text-foreground hover:bg-muted/50"
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-ui",
                      next ? "bg-background/15" : "bg-muted"
                    )}
                  >
                    <StepIcon step={key} />
                  </span>
                  {next ? (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-background/70">
                      {t("next")}
                    </span>
                  ) : null}
                </span>
                <span className="text-[13.5px] font-semibold leading-snug">{t(key)}</span>
                <span className={cn("text-xs leading-relaxed", next ? "text-background/70" : "text-muted-foreground")}>
                  {t(`${key}Body`)}
                </span>
                <span
                  className={cn(
                    "mt-auto inline-flex items-center gap-1 pt-1 text-[12.5px] font-medium",
                    !next && "text-foreground/80"
                  )}
                >
                  {t("start")}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          );
        })}
        {finished.map(({ key }) => (
          <li
            key={key}
            className="flex flex-col gap-2 rounded-card border border-dashed border-border-subtle p-3.5 text-muted-foreground/70"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-muted-foreground/45 text-card">
              <Check className="size-4" strokeWidth={3} aria-hidden />
            </span>
            <span className="text-[13.5px] font-medium leading-snug">{t(key)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The guide at the top of the home page: the owner's, until it is done or skipped. */
export function HomeSetupGuide() {
  const t = useTranslations("dashboard.setupGuide");
  const confirm = useConfirm();
  const { meProfile, meProfileStatus } = useAuth();
  const isOwner = meProfileStatus === "ready" && meProfile?.store?.role === "Owner";
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: setupGuideQueryKey,
    queryFn: fetchSetupGuide,
    enabled: isOwner,
    staleTime: 60_000,
  });
  const hide = useMutation({
    mutationFn: hideSetupGuide,
    onSuccess: (guide) => queryClient.setQueryData(setupGuideQueryKey, guide),
  });

  // Skipping takes the guide off the home page for good, so it is asked first (owner, 2026-09-29).
  async function skip() {
    const ok = await confirm({ title: t("skipTitle"), message: t("skipMessage"), confirmText: t("skip") });
    if (ok) hide.mutate();
  }

  if (!isOwner || !data?.show) return null;
  return <SetupGuideCard guide={data} onSkip={() => void skip()} skipping={hide.isPending} className="pb-rise" />;
}
