"use client";

import { useTranslations } from "next-intl";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import RecoverStorePanel from "@/components/auth/RecoverStorePanel";
import { useRecoverableStores } from "@/hooks/useRecoverableStores";

export default function RecoverPage() {
  const t = useTranslations("settings.recover");
  const { stores, loading, refetch } = useRecoverableStores();

  if (loading) {
    return (
      <AuthPageShell
        headline={t("heading")}
        description={t("subtitle")}
        containerClassName="space-y-8 sm:space-y-10"
      >
        <div className="mx-auto flex w-11/12 max-w-sm justify-center py-12 sm:w-full">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      headline={t("heading")}
      description={t("subtitle")}
      containerClassName="space-y-8 sm:space-y-10"
    >
      <div className="mx-auto w-11/12 max-w-sm space-y-6 sm:w-full">
        {stores.length === 0 ? (
          <p className="text-center text-sm leading-relaxed text-muted-foreground">{t("recoverEmpty")}</p>
        ) : (
          <RecoverStorePanel stores={stores} onRecovered={refetch} showHeader={false} />
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {t("recoverFooterText")}
      </p>
    </AuthPageShell>
  );
}
