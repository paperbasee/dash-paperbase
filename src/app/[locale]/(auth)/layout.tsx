import type { ReactNode } from "react";

import { AuthFrame } from "@/components/auth/AuthFrame";

/** Sign in, sign up and the email-link pages share one frame: the card over the shop wall. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthFrame>{children}</AuthFrame>;
}
