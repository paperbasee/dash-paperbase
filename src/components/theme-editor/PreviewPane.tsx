"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Store } from "lucide-react";

/**
 * Where the store preview goes. The frame arrives with editor step 4; it will live here
 * for the whole session, and the phone/desktop toggle only changes this box's width.
 * On a phone the box is always full width.
 */
export function PreviewPane({ width, pageName }: { width: string; pageName: string }) {
  const t = useTranslations("themeEditor");

  return (
    <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-muted/40 md:p-4">
      <div
        style={{ "--preview-width": width } as CSSProperties}
        className="flex min-h-full w-full flex-col items-center justify-center gap-2 bg-background p-6 text-center transition-[max-width] duration-300 md:max-w-[var(--preview-width)] md:rounded-card md:border md:border-border"
      >
        <Store className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium text-foreground">{pageName}</p>
        <p className="text-sm text-muted-foreground">{t("previewPlaceholder")}</p>
      </div>
    </div>
  );
}
