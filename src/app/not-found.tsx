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
  return (
    <AuthPageShell containerClassName="max-w-lg">
      <Card className="border-0 bg-transparent py-0 shadow-none">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Page not found
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            The page you’re looking for doesn’t exist or may have been moved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto w-11/12 max-w-sm space-y-3 sm:w-full">
            <Button asChild className="w-full">
              <a href="/en">Go to dashboard</a>
            </Button>
            <NotFoundBackButton className="w-full" label="Go back" />
          </div>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}

