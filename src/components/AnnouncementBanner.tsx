"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AnnouncementBannerProps {
  /** Optional className for the banner container */
  className?: string;
  /** Called when the user dismisses the banner. Parent should update layout (e.g. remove bannerOffset from Sidebar). */
  onDismiss: () => void;
  /** When true, sidebar is collapsed (banner uses left-16 on desktop). When false, uses left-72. */
  sidebarCollapsed?: boolean;
}

/**
 * Full-width announcement banner for BaaS-wide notifications:
 * maintenance, new changes, important updates. Persists until dismissed.
 * Fixed position: no scroll jitter. Aligns with sidebar header (--header-height).
 */
export default function AnnouncementBanner({
  className,
  onDismiss,
  sidebarCollapsed = false,
}: AnnouncementBannerProps) {
  return (
    <div
      role="banner"
      aria-live="polite"
      className={cn(
        "fixed right-0 top-0 z-50 flex h-[var(--header-height)] shrink-0 items-center justify-between gap-4 border-b border-border bg-muted px-4 text-sm transition-[left] duration-300",
        "left-0 md:left-16",
        !sidebarCollapsed && "md:left-72",
        className
      )}
    >
      <p className="min-w-0 flex-1 truncate text-muted-foreground">
        {/* Placeholder: replace with real announcement content */}
        New changes are live. Scheduled maintenance on March 20, 2–4 AM UTC.
      </p>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onDismiss}
        aria-label="Dismiss announcement"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
