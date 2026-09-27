"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/combobox";
import { useDistrictsQuery } from "@/hooks/useDistrictsQuery";
import {
  type District,
  districtLabel,
  districtMatches,
  findDistrict,
} from "@/lib/orders/districts";

type Option = { value: string; label: string; district: District | null };
type Division = { value: string; label: string; items: Option[] };

/**
 * The district of an order, picked from the 64 -- grouped by division, named
 * in the dashboard's language, found by typing either language or an old
 * spelling ("Chittagong"). It hands back the English name, which is what the
 * API saves and couriers read.
 *
 * An older order may carry words from before the list ("Dhaka city", a typo).
 * They are shown as they are and kept until the merchant picks a district --
 * the API accepts an order's own unchanged words, and nothing new.
 */
export function DistrictPicker({
  id,
  value,
  onChange,
  invalid,
  className,
}: {
  id?: string;
  value: string;
  onChange: (name: string) => void;
  invalid?: boolean;
  className?: string;
}) {
  const t = useTranslations("pages");
  const locale = useLocale();
  const { data: divisions = [], isPending } = useDistrictsQuery();

  const groups = useMemo<Division[]>(
    () =>
      divisions.map((division) => ({
        value: division.key,
        label: districtLabel(division, locale),
        items: division.districts
          .map((district) => ({ value: district.name, label: districtLabel(district, locale), district }))
          .sort((a, b) => a.label.localeCompare(b.label, locale)),
      })),
    [divisions, locale]
  );

  const selected = useMemo<Option | null>(() => {
    if (!value.trim()) return null;
    const listed = findDistrict(divisions, value);
    if (!listed) return { value, label: value, district: null };
    return { value: listed.name, label: districtLabel(listed, locale), district: listed };
  }, [divisions, locale, value]);

  return (
    <Combobox<Option>
      modal={false}
      items={groups}
      value={selected}
      isItemEqualToValue={(item, current) => item.value === current.value}
      itemToStringLabel={(item) => item.label}
      filter={(item, query) => !item.district || districtMatches(item.district, query)}
      onValueChange={(next) => onChange(next?.value ?? "")}
    >
      <ComboboxInput
        id={id}
        placeholder={t("orderFormDistrictChoose")}
        aria-invalid={invalid || undefined}
        className={className ?? "w-full"}
        inputClassName="cursor-text caret-auto"
      />
      <ComboboxContent>
        <ComboboxEmpty>{isPending ? t("orderFormDistrictLoading") : t("orderFormDistrictNone")}</ComboboxEmpty>
        <ComboboxList>
          {(group: Division) => (
            <ComboboxGroup key={group.value} items={group.items}>
              <ComboboxLabel>{group.label}</ComboboxLabel>
              <ComboboxCollection>
                {(option: Option) => (
                  <ComboboxItem key={option.value} value={option}>
                    {option.label}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
