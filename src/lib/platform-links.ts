/**
 * Paperbase's help page, which the dashboard's own pages outside it link to ("Need help? Talk to
 * us"). Set per deployment (Vercel, `.env.local`), never written here. Until it is set the words
 * show as plain text (owner, 2026-09-28) -- never a link to a page that does not exist. The terms
 * and the privacy policy are linked from Accounts' sign-in pages, where people agree to them.
 */
export const PLATFORM_LINKS = {
  help: process.env.NEXT_PUBLIC_SUPPORT_URL?.trim() || "",
} as const;
