"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";

import api from "@/lib/api";
import { cn } from "@/lib/utils";

export type CardVariantRow = {
  key: string;
  name: string;
  description: string;
};

type PresetsPayload = {
  presets?: unknown[];
  card_variants?: CardVariantRow[];
};

const sk = "animate-pulse rounded bg-muted";

/** Layout skeleton for storefront `ProductCard` (square media + corner chip + centered lines). */
function ClassicPreview() {
  return (
    <div
      className="pointer-events-none mt-3 overflow-hidden rounded-card border border-border/90 bg-card shadow-sm antialiased"
      aria-hidden
    >
      <article className="flex min-w-0 flex-col text-center">
        <div className="relative shrink-0">
          <div className={`relative aspect-square w-full border border-border ${sk}`} />
          <div className="absolute bottom-1.5 right-1.5 z-[2]">
            <div className={`size-7 rounded-full ring-1 ring-border ${sk}`} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 px-2 pb-1.5 pt-2">
          <div className={`mx-auto h-2 w-4/5 ${sk}`} />
          <div className={`mx-auto h-2 w-3/5 ${sk}`} />
          <div className="mt-0.5 flex justify-center gap-1.5">
            <div className={`h-2 w-10 ${sk}`} />
            <div className={`h-1.5 w-7 ${sk} opacity-80`} />
          </div>
        </div>
      </article>
    </div>
  );
}

/** Layout skeleton for storefront `ShelfProductCard` (media + price row + title + full-width CTA bar). */
function ShelfPreview() {
  return (
    <div
      className="pointer-events-none mt-3 overflow-hidden rounded-card border border-border/90 bg-card shadow-sm antialiased"
      aria-hidden
    >
      <article className="flex min-w-0 flex-col">
        <div className={`relative aspect-square w-full border border-border ${sk}`} />
        <div className="flex min-h-0 flex-1 flex-col gap-1 px-2 pb-1 pt-2">
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-9 ${sk}`} />
            <div className={`h-1.5 w-6 ${sk} opacity-80`} />
          </div>
          <div className={`h-2 w-full max-w-[92%] ${sk}`} />
          <div className={`h-1.5 w-2/3 ${sk}`} />
        </div>
        <div className="mt-auto px-0 pb-2 pt-1">
          <div className={`h-5 w-full ${sk}`} />
        </div>
      </article>
    </div>
  );
}

export function CardVariantPicker({
  selectedVariant,
  onSelect,
  disabled,
}: {
  selectedVariant: string | null;
  onSelect: (key: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("settings.customization");
  const [variants, setVariants] = useState<CardVariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await api.get<PresetsPayload>("theming/presets/");
        if (!cancelled) {
          setVariants(data.card_variants ?? []);
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "failed");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {t("loadingCardVariants")}
      </div>
    );
  }

  if (loadError || variants.length === 0) {
    return <p className="text-sm text-destructive">{t("cardVariantsError")}</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{t("productCardsHeading")}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {variants.map((row) => {
          const selected = selectedVariant === row.key;
          return (
            <button
              key={row.key}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(row.key)}
              className={cn(
                "rounded-card border p-4 text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected ? "border-foreground ring-2 ring-foreground/20" : "border-border hover:border-foreground/40",
                disabled && "pointer-events-none opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-foreground">{row.name}</span>
                {selected ? (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-background dark:bg-emerald-600">
                    <Check className="size-3.5 stroke-[2.5]" aria-hidden />
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{row.description}</p>
              {row.key === "shelf" ? <ShelfPreview /> : <ClassicPreview />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
