"use client";

import { useEffect } from "react";
import "./globals.css";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Shown when the root layout itself failed -- the translation system included -- so its words
 * live here, in both languages, Bangla first. They are the `errors` messages' own words; keep
 * them the same. (The guard test `tests/i18n/no-english-in-ui.test.ts` allows this file.)
 */
const WORDS = {
  bn: {
    title: "কিছু সমস্যা হয়েছে",
    body: "অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন।",
    reload: "আবার লোড করুন",
    dashboard: "ড্যাশবোর্ডে যান",
  },
  en: {
    title: "Something went wrong",
    body: "Please try again later.",
    reload: "Reload",
    dashboard: "Go to dashboard",
  },
} as const;

export default function GlobalError({
  error,
  reset: _reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <html lang="bn">
      <body className="antialiased font-sans">
        <AuthPageShell containerClassName="max-w-lg">
          <Card className="border-0 bg-transparent py-0 shadow-none">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {WORDS.bn.title}
              </CardTitle>
              <p className="text-base font-medium text-muted-foreground">{WORDS.en.title}</p>
              <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                {WORDS.bn.body}
                <br />
                {WORDS.en.body}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mx-auto w-11/12 max-w-sm space-y-3 sm:w-full">
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => window.location.reload()}
                >
                  {WORDS.bn.reload} · {WORDS.en.reload}
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <a href="/">
                    {WORDS.bn.dashboard} · {WORDS.en.dashboard}
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </AuthPageShell>
      </body>
    </html>
  );
}

