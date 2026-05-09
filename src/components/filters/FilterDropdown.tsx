import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export type FilterOption = {
  value: string;
  label: string;
  /** When set, list rows use this for display; combobox input still uses `label` (plain string). */
  labelDisplay?: ReactNode;
};

/** Internal item: `labelText` drives filtering + input text; `labelDisplay` is optional rich list content. */
type ComboItem = {
  value: string;
  labelText: string;
  labelDisplay: ReactNode;
};

function selectedComboItem(
  value: string | undefined,
  options: FilterOption[]
): ComboItem | null {
  const v = (value || "").trim();
  if (!v) return null;
  const found = options.find((o) => o.value === v);
  if (found) {
    return {
      value: found.value,
      labelText: found.label,
      labelDisplay: found.labelDisplay ?? found.label,
    };
  }
  return { value: v, labelText: v, labelDisplay: v };
}

export function FilterDropdown({
  value,
  onChange,
  placeholder,
  options,
  className = "",
  disabled = false,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: FilterOption[];
  className?: string;
  disabled?: boolean;
}) {
  const emptyItem = useMemo(
    (): ComboItem => ({
      value: "",
      labelText: placeholder,
      labelDisplay: placeholder,
    }),
    [placeholder]
  );

  const selected = useMemo(
    () => selectedComboItem(value, options),
    [value, options]
  );

  return (
    <Combobox<ComboItem>
      modal={false}
      value={selected}
      onValueChange={(next) => {
        if (next === null) return;
        onChange(next.value);
      }}
      isItemEqualToValue={(a, b) => a.value === b.value}
      itemToStringLabel={(item) => item?.labelText ?? ""}
    >
      <ComboboxInput
        disabled={disabled}
        placeholder={placeholder}
        showClear={false}
        className={className || "w-[calc(50%-0.25rem)] sm:w-[160px]"}
        inputClassName="cursor-pointer caret-transparent text-xs font-medium"
      />
      <ComboboxContent>
        <ComboboxList>
          <ComboboxItem value={emptyItem}>
            <span className="text-xs font-medium">{placeholder}</span>
          </ComboboxItem>
          {options.map((option) => {
            const item: ComboItem = {
              value: option.value,
              labelText: option.label,
              labelDisplay: option.labelDisplay ?? option.label,
            };
            return (
              <ComboboxItem key={option.value} value={item}>
                <span className="text-xs font-medium">{item.labelDisplay}</span>
              </ComboboxItem>
            );
          })}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
