"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { isAxiosError } from "axios";
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

function ClassicPreview() {
  return (
    <div className="mt-3 space-y-1.5" aria-hidden>
      <div className="h-10 w-full rounded border border-border bg-muted" />
      <div className="mx-auto h-1 w-3/4 rounded bg-muted-foreground/30" />
      <div className="mx-auto h-1 w-1/3 rounded bg-muted-foreground/25" />
    </div>
  );
}

function ShelfPreview({ orderNowLabel }: { orderNowLabel: string }) {
  return (
    <div className="mt-3 space-y-1.5" aria-hidden>
      <div className="h-10 w-full rounded border border-border bg-muted" />
      <div className="flex items-center gap-1.5">
        <span className="h-1 w-1/4 rounded bg-muted-foreground/35" />
        <span className="h-1 w-1/5 rounded bg-muted-foreground/20 line-through" />
      </div>
      <div className="mx-auto h-1 w-2/3 rounded bg-muted-foreground/30" />
      <div className="flex h-6 w-full items-center justify-center rounded border border-border bg-muted px-1 text-center text-[10px] font-medium leading-none text-muted-foreground">
        {orderNowLabel}
      </div>
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
          setLoadError(isAxiosError(e) ? e.message : "failed");
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                    <Check className="size-3.5" aria-hidden />
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{row.description}</p>
              {row.key === "shelf" ? <ShelfPreview orderNowLabel={t("shelfPreviewOrderNow")} /> : <ClassicPreview />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
