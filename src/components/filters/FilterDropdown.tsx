import { useMemo } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

type FilterOption = {
  value: string;
  label: string;
};

/** Base UI Combobox shows the item *value* in the input for string items; use `{ value, label }` so the label is displayed. */
type ComboItem = { value: string; label: string };

function selectedComboItem(
  value: string | undefined,
  options: FilterOption[]
): ComboItem | null {
  const v = (value || "").trim();
  if (!v) return null;
  const found = options.find((o) => o.value === v);
  if (found) return { value: found.value, label: found.label };
  return { value: v, label: v };
}

export function FilterDropdown({
  value,
  onChange,
  placeholder,
  options,
  className = "",
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: FilterOption[];
  className?: string;
}) {
  const emptyItem = useMemo(
    (): ComboItem => ({ value: "", label: placeholder }),
    [placeholder]
  );

  const selected = useMemo(
    () => selectedComboItem(value, options),
    [value, options]
  );

  return (
    <Combobox<ComboItem>
      value={selected}
      onValueChange={(next) => {
        if (next === null) return;
        onChange(next.value);
      }}
      isItemEqualToValue={(a, b) => a.value === b.value}
    >
      <ComboboxInput
        placeholder={placeholder}
        showClear={false}
        className={className || "w-[160px]"}
        inputClassName="cursor-pointer caret-transparent text-xs font-medium"
      />
      <ComboboxContent>
        <ComboboxList>
          <ComboboxItem value={emptyItem}>
            <span className="text-xs font-medium">{placeholder}</span>
          </ComboboxItem>
          {options.map((option) => {
            const item: ComboItem = { value: option.value, label: option.label };
            return (
              <ComboboxItem key={option.value} value={item}>
                <span className="text-xs font-medium">{option.label}</span>
              </ComboboxItem>
            );
          })}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
