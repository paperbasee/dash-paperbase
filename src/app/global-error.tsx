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
    <html lang="en">
      <body className="antialiased font-sans">
        <AuthPageShell containerClassName="max-w-lg">
          <Card className="border-0 bg-transparent py-0 shadow-none">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Something went wrong
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                Please try again later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mx-auto w-11/12 max-w-sm space-y-3 sm:w-full">
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => window.location.reload()}
                >
                  Reload
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <a href="/en">Go to dashboard</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </AuthPageShell>
      </body>
    </html>
  );
}

