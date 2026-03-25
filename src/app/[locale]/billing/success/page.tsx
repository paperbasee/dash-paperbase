import { Link } from "@/i18n/navigation";

import { Button } from "@/components/ui/button";

export default function BillingSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted px-4">
      <div className="w-full max-w-md border border-border bg-card p-8 shadow-xl backdrop-blur">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Subscription activated
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Payment receipt sent to your email.
        </p>
        <Button asChild className="mt-8 w-full">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
