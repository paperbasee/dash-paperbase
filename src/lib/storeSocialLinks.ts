/**
 * The shop's social accounts: Settings -> Store Info -> Identity, the one place any of them is
 * typed (owner, 2026-09-29: "the identity in the store info tab will be the source of truth").
 * The footer, the Contact page and the home page's Sign-up band only read them.
 *
 * A list the merchant builds, in their order, one account per platform -- saved on
 * `admin/branding/` as `social_links: [{ platform, account }]`. The platforms, and the rules that
 * decide whether what was typed names an account, are the API's
 * (`engine/apps/stores/social_links.py`); a save that names nothing comes back with the platform
 * to fix. Until 2026-09-29 these were four fixed boxes in the theme editor's footer.
 */

/** Every platform a shop can add, in the order they are offered. The API's `PLATFORMS`. */
export const SOCIAL_PLATFORMS = [
  "whatsapp",
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "telegram",
  "x",
  "linkedin",
  "pinterest",
  "threads",
  "snapchat",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type SocialAccount = { platform: SocialPlatform; account: string };

/**
 * Where the Sign-up band's button can go: every platform, and Messenger -- the Facebook page's
 * chat, which has no account of its own. The API's `SIGNUP_TARGETS`.
 */
export const SIGNUP_TARGETS = ["whatsapp", "messenger", ...SOCIAL_PLATFORMS.slice(1)] as const;

export type SignupTarget = (typeof SIGNUP_TARGETS)[number];

/** What to type for each platform, shown in its empty box. Not words: an example, in any language. */
export const ACCOUNT_EXAMPLES: Record<SocialPlatform, string> = {
  whatsapp: "01712-345678",
  facebook: "facebook.com/yourshop",
  instagram: "@yourshop",
  tiktok: "@yourshop",
  youtube: "@yourshop",
  telegram: "@yourshop",
  x: "@yourshop",
  linkedin: "linkedin.com/company/yourshop",
  pinterest: "pinterest.com/yourshop",
  threads: "@yourshop",
  snapchat: "@yourshop",
};

function isPlatform(value: unknown): value is SocialPlatform {
  return typeof value === "string" && (SOCIAL_PLATFORMS as readonly string[]).includes(value);
}

/** The accounts `admin/branding/` answers with, kept to what this screen can draw. */
export function accountsFromApi(raw: unknown): SocialAccount[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<SocialPlatform>();
  const out: SocialAccount[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { platform, account } = entry as { platform?: unknown; account?: unknown };
    if (!isPlatform(platform) || seen.has(platform) || typeof account !== "string") continue;
    seen.add(platform);
    out.push({ platform, account });
  }
  return out;
}

/** The accounts to save: the typed ones, in order. A box left empty is not an account. */
export function accountsToSave(accounts: SocialAccount[]): SocialAccount[] {
  return accounts
    .map(({ platform, account }) => ({ platform, account: account.trim() }))
    .filter(({ account }) => account !== "");
}

/** The account a Sign-up target opens, if the shop has one: Messenger's is the Facebook page. */
export function accountFor(target: SignupTarget, accounts: SocialAccount[]): SocialAccount | undefined {
  const platform = target === "messenger" ? "facebook" : target;
  return accounts.find((one) => one.platform === platform && one.account.trim() !== "");
}

/** The Sign-up targets this shop can use: a platform it has an account on, and Messenger with Facebook. */
export function availableTargets(accounts: SocialAccount[]): SignupTarget[] {
  return SIGNUP_TARGETS.filter((target) => accountFor(target, accounts) !== undefined);
}

/** Where every account is typed: Settings, on the Store Info tab. */
export const IDENTITY_HREF = "/settings?tab=store";
