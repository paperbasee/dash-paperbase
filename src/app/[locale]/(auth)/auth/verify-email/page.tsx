import { Suspense } from "react";

import VerifyEmailContent from "./VerifyEmailContent";
import { Spinner } from "@/components/ui/spinner";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-6 text-sm text-muted-foreground">
          <Spinner />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
