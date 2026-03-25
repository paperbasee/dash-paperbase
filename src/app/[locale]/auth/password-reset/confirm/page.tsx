import { Suspense } from "react";

import PasswordResetConfirmContent from "./PasswordResetConfirmContent";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export default function PasswordResetConfirmPage() {
  return (
    <AuthPageShell>
      <Suspense
        fallback={
          <div className="mx-auto w-11/12 max-w-sm text-center text-sm text-muted-foreground sm:w-full">
            Loading…
          </div>
        }
      >
        <PasswordResetConfirmContent />
      </Suspense>
    </AuthPageShell>
  );
}
