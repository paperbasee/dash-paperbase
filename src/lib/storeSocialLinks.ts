/** Keys must match `SOCIAL_LINK_PLATFORM_KEYS` in api-akkho `engine/apps/stores/social_links.py`. */
export const STORE_SOCIAL_LINK_KEYS = [
  "facebook",
  "instagram",
  "whatsapp",
  "tiktok",
] as const;

export type StoreSocialLinkKey = (typeof STORE_SOCIAL_LINK_KEYS)[number];

export function emptySocialLinks(): Record<StoreSocialLinkKey, string> {
  return Object.fromEntries(STORE_SOCIAL_LINK_KEYS.map((k) => [k, ""])) as Record<
    StoreSocialLinkKey,
    string
  >;
}

export function mergeSocialLinksFromApi(
  raw: Record<string, string> | null | undefined
): Record<StoreSocialLinkKey, string> {
  const base = emptySocialLinks();
  if (!raw || typeof raw !== "object") return base;
  for (const k of STORE_SOCIAL_LINK_KEYS) {
    const v = raw[k];
    if (typeof v === "string") base[k] = v;
  }
  return base;
}
