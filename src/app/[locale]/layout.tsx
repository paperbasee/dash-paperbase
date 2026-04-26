import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { AuthProvider } from "@/context/AuthContext";
import { ConfirmDialogProvider } from "@/context/ConfirmDialogContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { routing } from "@/i18n/routing";
import { LocaleSync } from "@/components/LocaleSync";
import { ThemeSync } from "@/components/ThemeSync";
import { NotificationProvider } from "@/notifications";
import { NotificationViewport } from "@/components/notifications/NotificationViewport";
import StoreProfileSWRProvider from "@/components/StoreProfileSWRProvider";

export const metadata: Metadata = {
  title: "Paperbase",
  description: "Paperbase dashboard",
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleSync />
      <ThemeSync />
      <TooltipProvider>
        <StoreProfileSWRProvider>
          <AuthProvider>
            <ConfirmDialogProvider>
              <NotificationProvider>
                {children}
                <NotificationViewport />
              </NotificationProvider>
            </ConfirmDialogProvider>
          </AuthProvider>
        </StoreProfileSWRProvider>
      </TooltipProvider>
    </NextIntlClientProvider>
  );
}
