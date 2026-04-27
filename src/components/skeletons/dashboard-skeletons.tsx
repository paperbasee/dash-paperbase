"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";

export function DashboardTableSkeleton({
  columns = 6,
  rows = 5,
  showHeader = true,
  showFilters = true,
  showPagination = true,
}: {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
  showFilters?: boolean;
  showPagination?: boolean;
}) {
  const { isLoggingOut } = useAuth();
  if (isLoggingOut) return null;
  return (
    <div className="space-y-6">
      {showHeader ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="hidden h-8 w-8 rounded-ui md:block" />
            <Skeleton className="h-8 w-56" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
      ) : null}

      {showFilters ? (
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-9 w-24" />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-card border border-dashed border-card-border bg-card">
        <div className="border-b border-border bg-muted/40 p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={`th-${i}`} className="h-4 w-full" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-border/60 p-4">
          {Array.from({ length: rows }).map((_, row) => (
            <div
              key={`tr-${row}`}
              className="grid gap-4 py-3"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columns }).map((__, col) => (
                <Skeleton key={`td-${row}-${col}`} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>

      {showPagination ? (
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      ) : null}
    </div>
  );
}

export function DashboardCardGridSkeleton({ cards = 6 }: { cards?: number }) {
  const { isLoggingOut } = useAuth();
  if (isLoggingOut) return null;
  return (
    <div className="rounded-card border border-dashed border-card-border bg-card p-3">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-card border border-border p-4">
            <Skeleton className="h-36 w-full rounded-ui" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardDetailSkeleton() {
  const { isLoggingOut } = useAuth();
  if (isLoggingOut) return null;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="hidden h-8 w-8 rounded-ui md:block" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-card border border-dashed border-card-border bg-card p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-3 h-8 w-20" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-card border border-dashed border-card-border bg-card p-4">
            <Skeleton className="h-5 w-44" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-card border border-dashed border-card-border bg-card p-4">
            <Skeleton className="h-5 w-32" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsSectionSkeleton() {
  const { isLoggingOut } = useAuth();
  if (isLoggingOut) return null;
  return (
    <div className="rounded-card border border-dashed border-card-border bg-card p-4">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="mt-2 h-4 w-72" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="mt-4 h-9 w-28" />
    </div>
  );
}
