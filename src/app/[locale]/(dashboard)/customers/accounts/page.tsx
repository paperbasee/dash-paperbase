"use client";

// Shoppers who signed in — its own address, in the sidebar under Customers.
//
// The detail page for one of them already lives a level below, at
// `accounts/[public_id]`, so this is the list above it rather than a tab
// somewhere else.

import { AccountsTab } from "../sections/AccountsTab";

/** The list draws the whole page, header and filters included: it holds the filter state. */
export default function CustomerAccountsPage() {
  return <AccountsTab />;
}
