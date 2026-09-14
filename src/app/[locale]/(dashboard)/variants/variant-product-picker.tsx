"use client";

import { useMemo, useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useVariantProductSearchQuery } from "@/hooks/useVariantsQuery";

type ProductOption = { value: string; label: string };

/**
 * Searchable product filter for the Variants page. While open it shows one page of products (the
 * newest when nothing is typed) and searches the server as the merchant types.
 */
export function VariantProductPicker({
  productId,
  productName,
  onChange,
  ariaLabel,
  placeholder,
  emptyText,
  loadingText,
  className,
}: {
  productId: string;
  /** Name of the selected product, once known. */
  productName: string | null;
  onChange: (productId: string) => void;
  ariaLabel: string;
  placeholder: string;
  emptyText: string;
  loadingText: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const searchQuery = useVariantProductSearchQuery(debouncedQuery, open);

  const items = useMemo<ProductOption[]>(
    () => (searchQuery.data ?? []).map((p) => ({ value: p.public_id, label: p.name })),
    [searchQuery.data]
  );
  const selected = useMemo<ProductOption | null>(
    () => (productId ? { value: productId, label: productName ?? "" } : null),
    [productId, productName]
  );
  const waiting = searchQuery.isFetching || debouncedQuery !== query;

  return (
    <Combobox<ProductOption>
      modal={false}
      items={items}
      filter={null}
      value={selected}
      isItemEqualToValue={(item, value) => item.value === value.value}
      itemToStringLabel={(item) => item.label}
      onValueChange={(next) => {
        setQuery("");
        onChange(next?.value ?? "");
      }}
      onInputValueChange={(value, details) => {
        if (details.reason === "input-change") setQuery(value);
      }}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <ComboboxInput
        aria-label={ariaLabel}
        placeholder={placeholder}
        showClear={!!productId}
        className={className}
        inputClassName="cursor-text caret-auto text-xs font-medium"
      />
      <ComboboxContent>
        <ComboboxEmpty>{waiting ? loadingText : emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: ProductOption) => (
            <ComboboxItem key={item.value} value={item}>
              <span className="truncate">{item.label}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
