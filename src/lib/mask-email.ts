/**
 * Mask an email address for display, Google-style: keep the first character of
 * the local part and of each domain label, hide the rest, preserve the TLD.
 *   "moderator@gmail.com" → "m•••@g•••.com"
 * Returns the input unchanged when it isn't email-shaped.
 */
export function maskEmail(email: string | null | undefined): string {
  const s = (email ?? "").trim();
  const at = s.indexOf("@");
  if (at <= 0) return s;
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  const maskLabel = (label: string) => (label ? `${label[0]}•••` : "•••");
  const dot = domain.lastIndexOf(".");
  if (dot > 0) {
    return `${maskLabel(local)}@${maskLabel(domain.slice(0, dot))}.${domain.slice(dot + 1)}`;
  }
  return `${maskLabel(local)}@${maskLabel(domain)}`;
}
