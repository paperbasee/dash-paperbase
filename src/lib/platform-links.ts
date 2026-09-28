/**
 * Paperbase's own pages the sign-in screens link to: help, the terms, the privacy policy. Set per
 * deployment (Vercel, `.env.local`), never written here, and a link whose address is not set is
 * not drawn -- a sign-up that promises terms must be able to show them.
 */
export const PLATFORM_LINKS = {
  help: process.env.NEXT_PUBLIC_SUPPORT_URL?.trim() || "",
  terms: process.env.NEXT_PUBLIC_TERMS_URL?.trim() || "",
  privacy: process.env.NEXT_PUBLIC_PRIVACY_URL?.trim() || "",
} as const;
