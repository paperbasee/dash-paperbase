import { Link } from "@/i18n/navigation";

import { Button } from "@/components/ui/button";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export default function PasswordResetSentPage() {
  return (
    <AuthPageShell>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Check your email
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          If an account exists with that email, we&apos;ve sent a password reset link.
        </p>
      </div>

      <div className="mx-auto w-11/12 max-w-sm space-y-6 sm:w-full">
        <Button asChild className="mt-2 w-full">
          <Link href="/login">Back to login</Link>
        </Button>
      </div>
    </AuthPageShell>
  );
}
