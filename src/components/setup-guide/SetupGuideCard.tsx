"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

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
} from "@/lib/setup-guide";
import { cn } from "@/lib/utils";

/**
 * The setup guide (owner, 2026-09-28): the last screen of setup, and the top of the home page
 * until every step is done or the owner skips it. Shopify-like -- one card, a progress line, and
 * each step a way straight to where it is done.
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
  const done = guide.steps.filter((step) => step.done).length;
  const total = guide.steps.length;
  // Creating the shop is always behind the owner here: setup did it.
  const isDone = (step: SetupGuide["steps"][number]) => step.done || step.key === "shop";
  // What is left comes first; what is done goes to the foot, greyed (owner, 2026-09-29).
  const steps = [...guide.steps.filter((step) => !isDone(step)), ...guide.steps.filter(isDone)];

  return (
    <section className={cn("overflow-hidden rounded-card border border-border-subtle bg-card", className)}>
      <header className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {toLocaleDigits(t("progress", { done, total }), locale)}
          </p>
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
      <div className="h-[3px] bg-muted">
        <div
          className="h-full bg-[hsl(var(--accent-green))] transition-[width] duration-1000 ease-out"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
      <ol>
        {steps.map((step) => {
          const { key } = step;
          const stepDone = step.done || key === "shop";
          const mark = (
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full",
                stepDone ? "bg-muted-foreground/45 text-card" : "border-[1.5px] border-dashed border-muted-foreground/40"
              )}
            >
              {stepDone ? <Check className="size-3" strokeWidth={3} aria-hidden /> : null}
            </span>
          );
          if (step.done || key === "shop") {
            return (
              <li
                key={key}
                className="flex items-center gap-3 border-t border-border-subtle px-4 py-3 text-sm text-muted-foreground/70 sm:px-5"
              >
                {mark}
                {t(key)}
              </li>
            );
          }
          return (
            <li key={key} className="border-t border-border-subtle">
              <Link
                href={SETUP_GUIDE_HREF[key]}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 sm:px-5"
              >
                {mark}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{t(key)}</span>
                  <span className="block truncate text-xs text-muted-foreground">{t(`${key}Body`)}</span>
                </span>
                <ChevronRight
                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
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
