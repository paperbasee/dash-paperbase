import axios from "axios";

const baseUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  return url.replace(/\/$/, "");
};

/**
 * POST /auth/email/verify/ — unauthenticated; used when user opens link from email.
 */
export async function verifyEmailFromLink(uid: string, token: string) {
  const { data } = await axios.post(`${baseUrl()}/auth/email/verify/`, {
    uid,
    token,
  });
  return data as { detail?: string };
}

/**
 * POST /auth/email/resend-verification/ — unauthenticated, email-driven, enumeration-safe response.
 */
export async function resendVerificationEmail(email: string) {
  const { data } = await axios.post(`${baseUrl()}/auth/email/resend-verification/`, {
    email: email.trim().toLowerCase(),
  });
  return data as { message?: string };
}

/**
 * POST /auth/password/reset/ — step 1 (enumeration-safe; always 200 on success).
 */
export async function requestPasswordReset(email: string) {
  const { data } = await axios.post(`${baseUrl()}/auth/password/reset/`, {
    email: email.trim().toLowerCase(),
  });
  return data as { detail?: string };
}

/**
 * POST /auth/password/reset/confirm/ — step 2 with uid + token from email link.
 */
export async function confirmPasswordReset(payload: {
  uid: string;
  token: string;
  new_password: string;
  new_password_confirm: string;
}) {
  const { data } = await axios.post(
    `${baseUrl()}/auth/password/reset/confirm/`,
    payload
  );
  return data as { detail?: string };
}
