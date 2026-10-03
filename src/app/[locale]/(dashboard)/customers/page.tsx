"use client";

// The phone-keyed customer list the shop has always had, built from orders.
//
// Shoppers who signed in are a separate record and a separate page, in the
// sidebar under this one. They are never merged, so the same person can appear
// in both — expected, not a duplicate to clean up. Letting a merchant link the
// two by hand is agreed for later.

import { CustomersTab } from "./sections/CustomersTab";

/** The list draws the whole page, header and filters included: it holds the filter state. */
export default function CustomersPage() {
  return <CustomersTab />;
}
