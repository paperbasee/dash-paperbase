import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { isTurnstileDisabled } from "@/lib/turnstile-env";
import { CORE_THEME_COOKIE_KEY } from "@/lib/theme";

/** Runs before paint: align <html> with localStorage/cookie + live prefers-color-scheme when preference is system. */
const THEME_BOOT_SCRIPT = `
(function(){
  try {
    var k=${JSON.stringify(CORE_THEME_COOKIE_KEY)};
    function gc(n){
      var p=('; '+document.cookie).split('; '+n+'=');
      if(p.length!==2)return null;
      return decodeURIComponent(p.pop().split(';').shift()||'');
    }
    var s=typeof localStorage!=='undefined'?localStorage.getItem(k):null;
    var c=gc(k);
    var pref=(s==='light'||s==='dark'||s==='system')?s
      :(c==='light'||c==='dark'||c==='system')?c
      :'system';
    var applied=pref==='system'
      ? (window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')
      : pref;
    var r=document.documentElement;
    r.classList.toggle('dark',applied==='dark');
    r.setAttribute('data-theme',applied);
  } catch(e){}
})();
`.trim();

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const headersList = await headers();
  const pref = cookieStore.get("core-theme")?.value;
  const appliedRaw = cookieStore.get("core-theme-applied")?.value;
  const applied = appliedRaw === "dark" || appliedRaw === "light" ? appliedRaw : undefined;
  const chScheme = headersList.get("sec-ch-prefers-color-scheme");

  let resolved: "light" | "dark" | undefined;
  if (pref === "light" || pref === "dark") {
    resolved = pref;
  } else if (pref === "system") {
    resolved =
      chScheme === "dark" || chScheme === "light" ? chScheme : applied;
  } else {
    /* No cookie yet or unknown value: treat like system for SSR (matches boot script default). */
    resolved =
      chScheme === "dark" || chScheme === "light" ? chScheme : applied;
  }

  const isDark = resolved === "dark";
  const dataTheme = resolved ?? "light";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={isDark ? "dark" : undefined}
      data-theme={dataTheme}
    >
      <head>
        {/* Inline script: Next.js <Script beforeInteractive> in body triggers a client-render warning in Next 16 / Turbopack. */}
        <script
          id="theme-boot"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
      </head>
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
