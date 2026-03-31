import type { ReactNode } from "react";
import "./globals.css";

const themeBootstrapScript = `(() => {
  const storageKey = "core-theme";
  const root = document.documentElement;
  const disableTransitionsClass = "theme-preload";

  const getSystemTheme = () =>
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

  const getStoredPreference = () => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    } catch {
      return "system";
    }
  };

  const preference = getStoredPreference();
  const applied = preference === "system" ? getSystemTheme() : preference;
  root.classList.toggle("dark", applied === "dark");
  root.setAttribute("data-theme", applied);
  root.classList.add(disableTransitionsClass);
  window.requestAnimationFrame(() => {
    root.classList.remove(disableTransitionsClass);
  });
})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
