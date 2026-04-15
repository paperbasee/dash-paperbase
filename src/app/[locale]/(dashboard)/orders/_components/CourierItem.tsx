"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

function normalizeCourierKey(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function ratioColor(ratioPct: number | null): string {
  if (ratioPct === null) return "text-muted-foreground";
  if (ratioPct > 80) return "text-emerald-600";
  if (ratioPct >= 50) return "text-amber-600";
  return "text-red-600";
}

function initials(label: string): string {
  const parts = String(label || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] || "";
  const second = parts[1]?.[0] || parts[0]?.[1] || "";
  return (first + second).toUpperCase() || "C";
}

export type CourierItemProps = {
  name: string;
  ratioPct: number | null;
  logoUrl?: string | null;
  className?: string;
};

export function CourierItem({ name, ratioPct, logoUrl, className }: CourierItemProps) {
  const key = useMemo(() => normalizeCourierKey(name), [name]);
  const candidates = useMemo(() => {
    const localBase = `/assets/courier-assets/${key}`;
    const remote = (logoUrl || "").trim();
    const preferWebpFirst = key === "carrybee" || remote.toLowerCase().endsWith(".webp");
    const localLogoCandidates = preferWebpFirst
      ? [`${localBase}-logo.webp`, `${localBase}-logo.png`]
      : [`${localBase}-logo.png`, `${localBase}-logo.webp`];
    const localPlainCandidates = preferWebpFirst
      ? [`${localBase}.webp`, `${localBase}.png`]
      : [`${localBase}.png`, `${localBase}.webp`];
    return [
      ...localLogoCandidates,
      ...localPlainCandidates,
      remote || null,
    ].filter(Boolean) as string[];
  }, [key, logoUrl]);

  const [srcIndex, setSrcIndex] = useState(0);
  const src = candidates[srcIndex] || null;
  const ratioText = ratioPct === null ? "—" : `${Math.round(ratioPct)}%`;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-ui border border-border/60 bg-background/40 px-3 py-2",
        className
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-ui border border-border bg-card">
        {!src ? (
          <span className="text-xs font-semibold text-muted-foreground">
            {initials(name)}
          </span>
        ) : (
          <Image
            src={src}
            alt={name}
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onError={() => {
              setSrcIndex((prev) => {
                const next = prev + 1;
                return next >= candidates.length ? prev : next;
              });
            }}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{name}</div>
        <div className={cn("text-xs font-semibold", ratioColor(ratioPct))}>
          {ratioText}
        </div>
      </div>
    </div>
  );
}

export type CourierLogoProps = {
  name: string;
  logoUrl?: string | null;
  className?: string;
  sizeClassName?: string;
};

export function CourierLogo({
  name,
  logoUrl,
  className,
  sizeClassName,
}: CourierLogoProps) {
  const key = useMemo(() => normalizeCourierKey(name), [name]);
  const candidates = useMemo(() => {
    const localBase = `/assets/courier-assets/${key}`;
    const remote = (logoUrl || "").trim();
    const preferWebpFirst = key === "carrybee" || remote.toLowerCase().endsWith(".webp");
    const localLogoCandidates = preferWebpFirst
      ? [`${localBase}-logo.webp`, `${localBase}-logo.png`]
      : [`${localBase}-logo.png`, `${localBase}-logo.webp`];
    const localPlainCandidates = preferWebpFirst
      ? [`${localBase}.webp`, `${localBase}.png`]
      : [`${localBase}.png`, `${localBase}.webp`];
    return [...localLogoCandidates, ...localPlainCandidates, remote || null].filter(
      Boolean
    ) as string[];
  }, [key, logoUrl]);

  const [srcIndex, setSrcIndex] = useState(0);
  const src = candidates[srcIndex] || null;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-ui bg-transparent",
        sizeClassName || "size-24",
        className
      )}
      aria-label={name}
    >
      {!src ? (
        <span className="text-xs font-semibold text-muted-foreground">
          {initials(name)}
        </span>
      ) : (
        <Image
          src={src}
          alt={name}
          width={88}
          height={88}
          className={cn(
            "object-contain",
            // Keep proportional even when container size changes in table rows
            sizeClassName?.includes("size-12")
              ? "h-10 w-10"
              : sizeClassName?.includes("size-14")
                ? "h-12 w-12"
                : sizeClassName?.includes("size-16")
                  ? "h-14 w-14"
                  : sizeClassName?.includes("size-20")
                    ? "h-18 w-18"
                    : "h-20 w-20"
          )}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onError={() => {
            setSrcIndex((prev) => {
              const next = prev + 1;
              return next >= candidates.length ? prev : next;
            });
          }}
        />
      )}
    </div>
  );
}

export { normalizeCourierKey };

