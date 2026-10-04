"use client";

import { FunnelIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

/**
 * A page's filter button, in its header (components/page/PageHeader): it opens the filters, which
 * are never on show otherwise (owner, 2026-10-04) -- so while one is on, the button wears a dot.
 */
export function FilterToggle({ open, active, onToggle }: { open: boolean; active: boolean; onToggle: () => void }) {
  const t = useTranslations("pages");
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="relative h-9 px-3"
      aria-label={active ? t("filtersToggleActiveAria") : t("filtersToggleAria")}
      aria-expanded={open}
      onClick={onToggle}
    >
      <FunnelIcon className="size-4" aria-hidden />
      {active ? (
        <span aria-hidden className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary ring-2 ring-background" />
      ) : null}
    </Button>
  );
}
