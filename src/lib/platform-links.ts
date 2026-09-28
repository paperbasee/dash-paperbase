/**
 * Paperbase's own pages the sign-in screens link to: help, the terms, the privacy policy. Set per
 * deployment (Vercel, `.env.local`), never written here. Until one is set its words show as
 * plain text (owner, 2026-09-28) -- never a link to a page that does not exist.
 */
export const PLATFORM_LINKS = {
  help: process.env.NEXT_PUBLIC_SUPPORT_URL?.trim() || "",
  terms: process.env.NEXT_PUBLIC_TERMS_URL?.trim() || "",
  privacy: process.env.NEXT_PUBLIC_PRIVACY_URL?.trim() || "",
} as const;
