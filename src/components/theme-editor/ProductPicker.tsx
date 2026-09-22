"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProductsQuery } from "@/hooks/useProductsQuery";
import { cn } from "@/lib/utils";

/**
 * Choosing the products for a band the merchant fills by hand.
 *
 * **A checklist, not one at a time** (owner, 2026-09-23). Featuring eight
 * products was eight rounds of open-search-pick-close; it is one round now, and
 * the order is the order they were ticked -- which is the order they appear in
 * the band.
 *
 * **Searched, never listed.** A shop with twelve products would be fine as a
 * list and a shop with twelve hundred would not, and the second is the one that
 * needs this to work. The search is the admin list endpoint the Products tab
 * already uses, so what a merchant finds here is what they would find there.
 *
 * A picture beside each name: two products in a shop are called "Denim Jacket",
 * and the merchant knows which is which by looking, not by reading an id.
 *
 * **Ticked products stay in the list** while a search narrows it, or a merchant
 * searching for the ninth would watch the first eight vanish and have no way to
 * tell what they had chosen.
 */
export function ProductPicker({
  open,
  value,
  most,
  onDone,
  onClose,
}: {
  open: boolean;
  /** What the band holds now, in its own order. */
  value: string[];
  /** The most this band may hold, so the list can say when it is full. */
  most: number;
  onDone: (publicIds: string[]) => void;
  onClose: () => void;
}) {
  const t = useTranslations("themeEditor");
  const [typed, setTyped] = useState("");
  const [search, setSearch] = useState("");
  // The ticks, kept here until Done: a merchant changing their mind twice
  // should not send two documents to the shop.
  const [ticked, setTicked] = useState<string[]>(value);
  const [known, setKnown] = useState<Record<string, { name: string; image: string }>>({});

  // Each opening starts fresh: the sheet is one component for the whole
  // session, and a merchant picking a second product should not have to clear
  // the first one's search.
  useEffect(() => {
    if (open) {
      setTyped("");
      setSearch("");
      setTicked(value);
    }
    // `value` on purpose omitted: re-reading it while the sheet is open would
    // throw away ticks the merchant has made and not yet pressed Done on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Typed letters settle before a request goes out. Without it every keystroke
  // is a query against a shop's whole catalogue.
  useEffect(() => {
    const id = setTimeout(() => setSearch(typed.trim()), 250);
    return () => clearTimeout(id);
  }, [typed]);

  const products = useProductsQuery({
    page_size: "20",
    ordering: "-created_at",
    ...(search ? { search } : {}),
  });
  const rows = products.data?.results ?? [];

  // Remember what a ticked product looks like, so it can stay in the list when
  // a search no longer returns it.
  useEffect(() => {
    if (!rows.length) return;
    setKnown((seen) => {
      const next = { ...seen };
      for (const row of rows) {
        next[row.public_id] = { name: row.name, image: row.image_url ?? row.image ?? "" };
      }
      return next;
    });
  }, [rows]);

  const shown = [
    ...ticked
      .filter((id) => !rows.some((row) => row.public_id === id))
      .map((id) => ({
        public_id: id,
        name: known[id]?.name ?? id,
        image_url: known[id]?.image ?? "",
        image: null,
        category_name: "",
      })),
    ...rows,
  ];
  const full = ticked.length >= most;

  function toggle(publicId: string) {
    setTicked((chosen) =>
      chosen.includes(publicId)
        ? chosen.filter((id) => id !== publicId)
        : full
          ? chosen
          : [...chosen, publicId],
    );
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={t("productSearch")}
            aria-label={t("productSearch")}
            className="pl-9"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {products.isPending ? (
          <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("productLoading")}
          </p>
        ) : products.isError ? (
          <p role="alert" className="p-3 text-sm text-destructive">
            {t("productFailed")}
          </p>
        ) : shown.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            {search ? t("productNoMatches", { search }) : t("productNoneYet")}
          </p>
        ) : (
          <ul className="m-0 list-none space-y-1 p-0">
            {shown.map((product) => {
              const chosen = ticked.includes(product.public_id);
              return (
                <li key={product.public_id}>
                  <label
                    className={cn(
                      "flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-card px-2 py-1.5",
                      "hover:bg-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-primary",
                      chosen && "bg-accent",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={chosen}
                      // Full means the ticked ones can still be UNticked, and
                      // nothing else can be added -- a disabled row a merchant
                      // has ticked would trap them at eight.
                      disabled={!chosen && full}
                      onChange={() => toggle(product.public_id)}
                      className="size-4 shrink-0 accent-[var(--primary)]"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element -- a
                        merchant upload on a bucket the dashboard configures no
                        loader for */}
                    <img
                      src={product.image_url ?? product.image ?? ""}
                      alt=""
                      className="size-10 shrink-0 rounded-xs border border-border-subtle object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{product.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {product.category_name ?? ""}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/*
        Done applies every tick at once. The count says where the merchant
        stands against the cap before they press it, rather than a refusal
        afterwards.
      */}
      <div className="flex items-center justify-between gap-3 border-t border-border p-3">
        <p className="text-xs text-muted-foreground">
          {t("productChosenCount", { count: ticked.length, max: most })}
        </p>
        <Button
          type="button"
          onClick={() => {
            onDone(ticked);
            onClose();
          }}
        >
          {t("productDone")}
        </Button>
      </div>
    </div>
  );
}
