"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Error({
  error,
  reset: _reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("errors");
  const tCommon = useTranslations("common");

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <AuthPageShell containerClassName="max-w-lg">
      <Card className="border-0 bg-transparent py-0 shadow-none">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t("genericTitle")}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            {t("genericBody")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto w-11/12 max-w-sm space-y-3 sm:w-full">
            <Button
              type="button"
              className="w-full"
              onClick={() => window.location.reload()}
            >
              {tCommon("reload")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push("/")}
            >
              {t("goToDashboard")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}

