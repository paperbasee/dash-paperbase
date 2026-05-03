"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { isAxiosError } from "axios";
import { Check, Loader2 } from "lucide-react";

import api from "@/lib/api";
import { cn } from "@/lib/utils";

export type PresetRow = {
  key: string;
  name: string;
  tokens: Record<string, string>;
};

type PresetsPayload = {
  presets: PresetRow[];
};

const DESCRIPTION_KEYS: Record<string, "paletteIvory" | "paletteNoir" | "paletteArctic" | "paletteSage"> = {
  ivory: "paletteIvory",
  noir: "paletteNoir",
  arctic: "paletteArctic",
  sage: "paletteSage",
};

/** Palettes from the API that are not yet selectable. Add keys here to disable a preset in the UI. */
const PRESET_UNAVAILABLE = new Set<string>();

export function PalettePicker({
  selectedPalette,
  onSelect,
  disabled,
}: {
  selectedPalette: string | null;
  onSelect: (key: string, tokens: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("settings.customization");
  const [presets, setPresets] = useState<PresetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await api.get<PresetsPayload>("theming/presets/");
        if (!cancelled) {
          setPresets(data.presets ?? []);
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(isAxiosError(e) ? e.message : "failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
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
        {t("loadingPresets")}
      </div>
    );
  }

  if (loadError || presets.length === 0) {
    return <p className="text-sm text-destructive">{t("presetsError")}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {presets.map((p) => {
        const selected = selectedPalette === p.key;
        const unavailable = PRESET_UNAVAILABLE.has(p.key);
        const descKey = DESCRIPTION_KEYS[p.key];
        const description = unavailable ? t("paletteUnderDevelopment") : descKey ? t(descKey) : "";
        const bg = p.tokens.background ?? "#fff";
        const surfaceSwatch = p.tokens.card ?? p.tokens.surface ?? "#eee";
        const accent = p.tokens.accent ?? "#999";
        const primary = p.tokens.primary ?? "#000";
        const isDisabled = Boolean(disabled) || unavailable;
        return (
          <button
            key={p.key}
            type="button"
            disabled={isDisabled}
            onClick={() => {
              if (unavailable) return;
              onSelect(p.key, p.tokens);
            }}
            className={cn(
              "rounded-card border p-4 text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "border-foreground ring-2 ring-foreground/20" : "border-border hover:border-foreground/40",
              unavailable && "hover:border-border",
              isDisabled && "pointer-events-none opacity-60",
              unavailable && selected && "opacity-100"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-foreground">{p.name}</span>
              {selected ? (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                  <Check className="size-3.5" aria-hidden />
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            <div
              className="mt-3 flex h-8 w-full overflow-hidden rounded-md border border-border"
              aria-hidden
            >
              <span className="flex-1" style={{ backgroundColor: bg }} />
              <span className="flex-1" style={{ backgroundColor: surfaceSwatch }} />
              <span className="flex-1" style={{ backgroundColor: accent }} />
              <span className="flex-1" style={{ backgroundColor: primary }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
