import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { Button } from "@/components/ui/button";
import { NotFoundBackButton } from "@/components/system/NotFoundBackButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  const t = useTranslations("errors");
  const tPages = useTranslations("pages");

  return (
    <AuthPageShell containerClassName="max-w-lg">
      <Card className="border-0 bg-transparent py-0 shadow-none">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t("notFoundTitle")}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            {t("notFoundBody")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto w-11/12 max-w-sm space-y-3 sm:w-full">
            <Button asChild className="w-full">
              <Link href="/">{t("goToDashboard")}</Link>
            </Button>
            <NotFoundBackButton className="w-full" label={tPages("goBack")} />
          </div>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}

