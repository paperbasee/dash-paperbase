import { Suspense } from "react";

import VerifyEmailContent from "./VerifyEmailContent";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export default function VerifyEmailPage() {
  return (
    <AuthPageShell>
      <Suspense
        fallback={
          <div className="mx-auto w-11/12 max-w-sm text-center text-sm text-muted-foreground sm:w-full">
            Loading…
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </AuthPageShell>
  );
}
