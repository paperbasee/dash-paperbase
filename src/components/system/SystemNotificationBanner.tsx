"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

import { Button } from "@/components/ui/button";
import { useSystemNotification } from "@/hooks/useSystemNotification";
import { dismissSystemNotification } from "@/lib/api/systemNotification";
import { cn } from "@/lib/utils";

interface SystemNotificationBannerProps {
  className?: string;
  sidebarCollapsed?: boolean;
  placement?: "top" | "sidebar";
  /** When the banner should affect layout offset (has content and should show chrome). */
  onPresenceChange?: (visible: boolean) => void;
}

type CtaTarget =
  | { kind: "internal"; path: string }
  | { kind: "external"; href: string };

function parseCtaTarget(raw: string): CtaTarget | null {
  const t = raw.trim();
  if (!t || t.startsWith("//")) return null;

  if (t.startsWith("/")) {
    if (t.includes("\n") || t.includes("\r")) return null;
    return { kind: "internal", path: t };
  }

  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return { kind: "external", href: u.href };
  } catch {
    return null;
  }
}

export default function SystemNotificationBanner({
  className,
  sidebarCollapsed = false,
  placement = "top",
  onPresenceChange,
}: SystemNotificationBannerProps) {
  const router = useRouter();
  const t = useTranslations("systemBanner");
  const { notification, isLoading, isError } = useSystemNotification();
  const [hiddenPublicId, setHiddenPublicId] = useState<string | null>(null);
  const [isDismissing, setIsDismissing] = useState(false);

  const isOptimisticallyHidden =
    !!notification && hiddenPublicId === notification.public_id;

  useEffect(() => {
    if (isLoading || isError || isOptimisticallyHidden) {
      onPresenceChange?.(false);
      return;
    }
    onPresenceChange?.(!!notification);
  }, [isLoading, isError, isOptimisticallyHidden, notification, onPresenceChange]);

  if (isLoading || isError || !notification || isOptimisticallyHidden) {
    return null;
  }

  const ctaText = notification.cta_text?.trim();
  const ctaUrlRaw = notification.cta_url?.trim();
  const ctaTarget =
    ctaText && ctaUrlRaw ? parseCtaTarget(ctaUrlRaw) : null;

  if (placement === "sidebar") {
    return (
      <div
        aria-live="polite"
        aria-label={`${notification.title}. ${notification.message}`}
        className={cn(
          "system-notification-banner rounded-xl border p-3",
          className
        )}
      >
        <div className="flex items-start gap-2">
          <p className="system-notification-banner__title min-w-0 flex-1 text-sm font-semibold">
            {notification.title}
          </p>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={async () => {
              if (isDismissing) return;
              setIsDismissing(true);
              setHiddenPublicId(notification.public_id);
              try {
                await dismissSystemNotification(notification.public_id);
              } catch {
                setHiddenPublicId(null);
              } finally {
                setIsDismissing(false);
              }
            }}
            disabled={isDismissing}
            aria-label={t("dismissAria")}
            className="system-notification-banner__dismiss shrink-0"
          >
            <X className="size-4" />
          </Button>
        </div>
        <p className="system-notification-banner__text-muted mt-1 line-clamp-3 text-sm">
          {notification.message}
        </p>
        {ctaText && ctaTarget && (
          <Button
            type="button"
            variant="link"
            className="system-notification-banner__cta mt-1 h-auto p-0 text-sm underline underline-offset-2"
            onClick={() => {
              if (ctaTarget.kind === "internal") {
                router.push(ctaTarget.path);
                return;
              }
              window.open(ctaTarget.href, "_blank", "noopener,noreferrer");
            }}
          >
            {ctaText}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="banner"
      aria-live="polite"
      aria-label={`${notification.title}. ${notification.message}`}
      className={cn(
        "system-notification-banner fixed right-0 top-[var(--subscription-banner-offset,0px)] z-50 flex h-[var(--header-height)] shrink-0 items-center border-b px-4 text-sm transition-[left] duration-300",
        "left-0 md:left-16",
        !sidebarCollapsed && "md:left-72",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center justify-center gap-x-3 gap-y-1 px-8 pr-12 text-center sm:px-10 sm:pr-14">
        <p className="system-notification-banner__text max-w-[min(100%,36rem)] truncate">
          {notification.message}
        </p>
        {ctaText && ctaTarget && (
          <Button
            type="button"
            variant="link"
            className="system-notification-banner__cta h-auto shrink-0 p-0 underline underline-offset-4"
            onClick={() => {
              if (ctaTarget.kind === "internal") {
                router.push(ctaTarget.path);
                return;
              }
              window.open(ctaTarget.href, "_blank", "noopener,noreferrer");
            }}
          >
            {ctaText}
          </Button>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={async () => {
          if (isDismissing) return;
          setIsDismissing(true);
          setHiddenPublicId(notification.public_id);
          try {
            await dismissSystemNotification(notification.public_id);
          } catch {
            setHiddenPublicId(null);
          } finally {
            setIsDismissing(false);
          }
        }}
        disabled={isDismissing}
        aria-label={t("dismissAria")}
        className="system-notification-banner__dismiss absolute right-3 top-1/2 shrink-0 -translate-y-1/2 sm:right-4"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
