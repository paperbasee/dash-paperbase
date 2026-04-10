"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getAvatarUrl } from "@/lib/avatar";

interface UserAvatarProps {
  publicId: string | null;
  name?: string;
  plan?: string | null;
  /** Red ring when subscription is in grace or expired (overrides premium gold). */
  urgentSubscriptionRing?: boolean;
  className?: string;
}

function getInitial(name?: string): string {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

function getPlanRingClasses(plan?: string | null, urgentSubscriptionRing?: boolean): string {
  if (urgentSubscriptionRing) {
    return "ring-2 ring-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]";
  }
  if (plan?.toLowerCase() === "premium") {
    return "ring-2 ring-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)]";
  }
  return "";
}

export default function UserAvatar({ publicId, name, plan, urgentSubscriptionRing, className }: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const ringClasses = getPlanRingClasses(plan, urgentSubscriptionRing);

  if (publicId && !imgFailed) {
    return (
      <img
        src={getAvatarUrl(publicId)}
        alt={name || "User avatar"}
        onError={() => setImgFailed(true)}
        className={cn("size-8 shrink-0 rounded-full object-cover", ringClasses, className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary",
        ringClasses,
        className,
      )}
      aria-label={name || "User avatar"}
    >
      {getInitial(name)}
    </span>
  );
}
