/**
 * The shop's social links. Keys must match `SOCIAL_LINK_PLATFORM_KEYS` in the API's
 * `engine/apps/stores/social_links.py`.
 *
 * Typed in the theme editor since 2026-09-26 -- the footer's Social links place, beside the marks
 * they draw -- and saved where they always were, on the shop's settings (`admin/branding/`). They
 * were in Settings until then; the owner moved them "to the theme editor" so the Sign-up band's
 * button and the footer read one answer, typed where it shows.
 */
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

/**
 * Where the home page's Sign-up band can send a shopper, in the editor's order (2026-09-26).
 * Messenger has no box of its own: it is the Facebook page's inbox.
 */
export const SIGNUP_PLATFORMS = ["whatsapp", "messenger", "facebook", "instagram", "tiktok"] as const;

export type SignupPlatform = (typeof SIGNUP_PLATFORMS)[number];

/** The box a platform's link is typed in. */
export function linkBoxFor(platform: SignupPlatform): StoreSocialLinkKey {
  return platform === "messenger" ? "facebook" : platform;
}

/**
 * Whether the shop has anything in the box this platform reads. The shop is the judge of whether
 * it names an account (`storefront/social.py`); this is enough to say "add your link" when the box
 * is empty.
 */
export function hasLinkFor(platform: SignupPlatform, links: Record<StoreSocialLinkKey, string>): boolean {
  return links[linkBoxFor(platform)].trim() !== "";
}
