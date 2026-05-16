"use client";

import { useTranslations } from "next-intl";
import { AddressBookIcon } from "@phosphor-icons/react";
import { splitShippingAddressForForm } from "@/lib/orders/shipping-address-parts";

type OrderPreviewShippingAddressProps = {
  shippingAddress: string;
  district: string;
};

export function OrderPreviewShippingAddress({
  shippingAddress,
  district,
}: OrderPreviewShippingAddressProps) {
  const tPages = useTranslations("pages");
  const addr = splitShippingAddressForForm(shippingAddress);
  const displayVillage = addr.thana ? addr.village : "";
  const displayThana = addr.thana ? addr.thana : addr.village;
  const districtLine = district?.trim() || addr.trailingDistrict || "—";

  return (
    <div className="flex items-start gap-2.5 border-t border-border/60 pt-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card bg-muted">
        <AddressBookIcon className="size-3.5 text-muted-foreground" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {tPages("orderDetailShippingAddress")}
        </p>
        <p className="text-xs text-foreground">
          <span className="text-muted-foreground">{tPages("orderFormRoadVillage")}: </span>
          {displayVillage || "—"}
        </p>
        <p className="text-xs text-foreground">
          <span className="text-muted-foreground">{tPages("orderDetailCityThana")}: </span>
          {displayThana || "—"}
        </p>
        <p className="text-xs text-foreground">
          <span className="text-muted-foreground">{tPages("orderFormDistrict")}: </span>
          {districtLine}
        </p>
      </div>
    </div>
  );
}
