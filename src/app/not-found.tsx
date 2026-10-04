import { getTranslations } from "next-intl/server";
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

/**
 * A page outside every language's address (`[locale]/not-found.tsx` serves the rest). Nothing
 * here says which language the merchant reads, so it says it in both: Bangla first, as most
 * merchants read it, with the English beneath.
 */
export default async function NotFound() {
  const [bn, en] = await Promise.all([
    getTranslations({ locale: "bn", namespace: "errors" }),
    getTranslations({ locale: "en", namespace: "errors" }),
  ]);
  const [bnPages, enPages] = await Promise.all([
    getTranslations({ locale: "bn", namespace: "pages" }),
    getTranslations({ locale: "en", namespace: "pages" }),
  ]);

  return (
    <AuthPageShell containerClassName="max-w-lg">
      <Card className="border-0 bg-transparent py-0 shadow-none">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {bn("notFoundTitle")}
          </CardTitle>
          <p className="text-base font-medium text-muted-foreground">{en("notFoundTitle")}</p>
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            {bn("notFoundBody")}
            <br />
            {en("notFoundBody")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto w-11/12 max-w-sm space-y-3 sm:w-full">
            <Button asChild className="w-full">
              <a href="/">
                {bn("goToDashboard")} · {en("goToDashboard")}
              </a>
            </Button>
            <NotFoundBackButton className="w-full" label={`${bnPages("goBack")} · ${enPages("goBack")}`} />
          </div>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
