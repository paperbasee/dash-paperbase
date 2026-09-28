import { phoneSchema } from "@/lib/validation/common";

/**
 * A Bangladeshi mobile number as the shop keeps it (01XXXXXXXXX), or null. The box sits after a
 * +880 prefix, so it takes the number with or without its leading 0, spaces, dashes, or +880;
 * what it keeps is held to the dashboard's one phone rule (validation/common.ts).
 */
export function normalizeBdMobile(typed: string): string | null {
  let digits = typed.replace(/\D/g, "");
  if (digits.startsWith("880")) digits = digits.slice(3);
  if (digits.length === 10 && digits.startsWith("1")) digits = `0${digits}`;
  return digits && phoneSchema().safeParse(digits).success ? digits : null;
}
