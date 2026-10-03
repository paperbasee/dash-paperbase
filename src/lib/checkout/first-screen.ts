/**
 * Where the plan payment page opens (owner, 2026-10-03), from Paperbase's own numbers (Django
 * admin > Paperbase payment numbers, api billing/payment/config/): with both, the merchant picks
 * (or keeps what they picked a moment ago); with one, straight to it; with none, a page that says
 * payment is not set up -- never a form with no number to pay to.
 */
export type Provider = "bkash" | "nagad";

export type FirstScreen =
  | { screen: "selectProvider" }
  | { screen: "form"; provider: Provider }
  | { screen: "notSetUp" };

export function firstScreen(
  numbers: { bkash_number?: string | null; nagad_number?: string | null },
  picked: string | null,
): FirstScreen {
  const bkash = Boolean(numbers.bkash_number?.trim());
  const nagad = Boolean(numbers.nagad_number?.trim());
  if (bkash && nagad) {
    return picked === "bkash" || picked === "nagad" ? { screen: "form", provider: picked } : { screen: "selectProvider" };
  }
  if (bkash) return { screen: "form", provider: "bkash" };
  if (nagad) return { screen: "form", provider: "nagad" };
  return { screen: "notSetUp" };
}
