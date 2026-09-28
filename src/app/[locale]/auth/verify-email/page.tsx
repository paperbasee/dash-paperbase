import { Suspense } from "react";

import VerifyEmailContent from "./VerifyEmailContent";
import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { Spinner } from "@/components/ui/spinner";

export default function VerifyEmailPage() {
  return (
    <AuthSplitShell showcase="signup">
      <Suspense
        fallback={
          <div className="mx-auto w-11/12 max-w-sm text-center text-sm text-muted-foreground sm:w-full">
            <div className="inline-flex items-center gap-2">
              <Spinner />
              <span>Loading</span>
            </div>
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </AuthSplitShell>
  );
}
