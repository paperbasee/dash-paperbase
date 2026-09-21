"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/filters/FilterDropdown";
import { useBrandsQuery } from "@/hooks/useBrandsQuery";
import { brandsQueryKey } from "@/lib/query-keys";
import { normalizeError } from "@/notifications";
import type { AdminBrand } from "@/types";

/**
 * Pick the product's brand, or make one without leaving the page.
 *
 * The brand used to be a free-text box here, which is how a shop ended up with
 * *Bata*, *bata* and *BATA*. Picking from a list makes that impossible; the
 * plus keeps it from being slower than typing, which is the only reason a
 * merchant would have wanted the box back.
 *
 * Quick-create takes a name and nothing else. The picture and the description
 * belong on the Brands tab -- a merchant halfway through writing a product is
 * not the person who wants to be asked for a logo.
 */
export function BrandPicker({
  value,
  onChange,
  disabled = false,
  className = "",
}: {
  /** The brand's `public_id`, or "" for no brand. */
  value: string;
  onChange: (publicId: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const { data: brands = [], isLoading } = useBrandsQuery();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const options = useMemo(
    () =>
      brands.map((brand) => ({
        value: brand.public_id,
        // An inactive brand still has products on it, so it has to be
        // pickable and readable here -- just marked, so nobody chooses one by
        // accident and wonders why the shop has no page for it.
        label: brand.is_active ? brand.name : `${brand.name} (${tCommon("inactive")})`,
      })),
    [brands, tCommon]
  );

  async function createBrand() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    setCreateError(null);
    try {
      const { data } = await api.post<AdminBrand>("admin/brands/", { name });
      // Put it in the cache before selecting it, so the dropdown has a label
      // for the id it is about to be handed.
      await queryClient.invalidateQueries({ queryKey: brandsQueryKey });
      onChange(data.public_id);
      setCreating(false);
      setNewName("");
    } catch (err) {
      // Inline, not a toast: the merchant is looking at this box, and the
      // usual answer is "you already have a brand with that name", which is
      // only useful next to the thing they typed.
      setCreateError(normalizeError(err, tPages("brandPickerCreateFailed")).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <FilterDropdown
          value={value}
          onChange={onChange}
          placeholder={
            isLoading ? tCommon("loading") : tPages("brandPickerPlaceholder")
          }
          options={options}
          disabled={disabled}
          inputAriaLabel={tPages("productBrand")}
          className="min-w-0 flex-1"
        />
        <button
          type="button"
          onClick={() => {
            setCreating((open) => !open);
            setCreateError(null);
          }}
          disabled={disabled}
          aria-expanded={creating}
          aria-label={tPages("brandPickerAddAria")}
          title={tPages("brandPickerAddAria")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ui border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          {creating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>

      {creating ? (
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={tPages("brandPickerNewPlaceholder")}
              className="min-w-0 flex-1"
              onKeyDown={(e) => {
                // The product form submits on Enter. Inside this box Enter
                // means "add this brand", never "save the product" -- which
                // would save it half-written and with no brand at all.
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  void createBrand();
                }
              }}
            />
            <Button
              type="button"
              loading={saving}
              disabled={saving || !newName.trim()}
              onClick={() => void createBrand()}
              className="shrink-0 rounded-card bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {tCommon("add")}
            </Button>
          </div>
          {createError ? (
            <p className="text-xs text-destructive">{createError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{tPages("brandPickerNewHint")}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
