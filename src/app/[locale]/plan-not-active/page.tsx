"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { getAccessToken } from "@/lib/auth";
import SubscriptionAccessBlock from "@/components/auth/SubscriptionAccessBlock";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export default function PlanNotActivePage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    setAllowed(true);
  }, [router]);

  if (!allowed) {
    return (
      <AuthPageShell>
        <div className="mx-auto flex w-full max-w-sm items-center justify-center py-6 sm:py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AuthPageShell>
    );
  }

  return <SubscriptionAccessBlock variant="inactive" />;
}
