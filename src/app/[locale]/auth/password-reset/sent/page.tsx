import { Link } from "@/i18n/navigation";

import { Button } from "@/components/ui/button";

export default function PasswordResetSentPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted px-4">
      <div className="w-full max-w-md border border-border bg-card p-8 shadow-xl backdrop-blur">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Check your email
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          If an account exists with that email, we&apos;ve sent a password reset
          link.
        </p>
        <Button asChild className="mt-8 w-full">
          <Link href="/login">Back to login</Link>
        </Button>
      </div>
    </div>
  );
}
