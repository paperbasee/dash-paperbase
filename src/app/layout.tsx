import type { ReactNode } from "react";
import { cookies } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { isTurnstileDisabled } from "@/lib/turnstile-env";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const pref = cookieStore.get("core-theme")?.value;
  const applied = cookieStore.get("core-theme-applied")?.value;
  const resolved =
    pref === "dark" || pref === "light"
      ? pref
      : applied === "dark" || applied === "light"
        ? applied
        : undefined;
  const isDark = resolved === "dark";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={isDark ? "dark" : undefined}
      data-theme={resolved}
    >
      <head />
      <body className="antialiased font-sans">
        {children}
        {!isTurnstileDisabled() ? (
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
