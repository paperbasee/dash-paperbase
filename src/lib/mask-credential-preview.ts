/**
 * Short preview of a credential-like identifier for dashboard list rows.
 * Passes through values that already contain masking asterisks from the API.
 */
export function maskCredentialPreview(value: string | null | undefined): string {
  const s = (value ?? "").trim();
  if (!s) return "";
  if (/\*+/.test(s)) return s;
  const len = s.length;
  if (len <= 4) return "****";
  if (len <= 8) return `${s.slice(0, 2)}****${s.slice(-2)}`;
  return `${s.slice(0, 4)}****${s.slice(-4)}`;
}
