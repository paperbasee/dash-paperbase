import type { ReactNode } from "react";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Script from "next/script";
import { Noto_Sans_Bengali, Poppins } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { isTurnstileDisabled } from "@/lib/turnstile-env";
import { CORE_THEME_COOKIE_KEY } from "@/lib/theme";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-bengali",
  display: "swap",
});

export const metadata: Metadata = {
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-64x64.png", sizes: "64x64", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon-128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/favicon-180x180.png", sizes: "180x180", type: "image/png" },
      { url: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon-256x256.png", sizes: "256x256", type: "image/png" },
      { url: "/favicon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#ffffff",
};

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
  const locale = await getLocale();
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
      lang={locale}
      suppressHydrationWarning
      className={[isDark ? "dark" : undefined, poppins.className, notoSansBengali.variable]
        .filter(Boolean)
        .join(" ")}
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
