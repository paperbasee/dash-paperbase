import { apiClient } from "@/lib/api-client";

const baseUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  return url.replace(/\/$/, "");
};

/**
 * POST /auth/email/verify/ — unauthenticated; used when user opens link from email.
 */
export async function verifyEmailFromLink(uid: string, token: string) {
  baseUrl();
  return apiClient.post("auth/email/verify/", { uid, token }) as Promise<{ detail?: string }>;
}

/**
 * POST /auth/email/resend-verification/ — unauthenticated, email-driven, enumeration-safe response.
 */
export async function resendVerificationEmail(email: string) {
  baseUrl();
  return apiClient.post("auth/email/resend-verification/", {
    email: email.trim().toLowerCase(),
  }) as Promise<{ message?: string }>;
}
