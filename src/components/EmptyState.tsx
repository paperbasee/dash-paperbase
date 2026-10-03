"use client";

/**
 * An empty list (owner, 2026-10-03): a drawing with a face that comes alive when pointed at or
 * tapped, what is missing under it and, where the merchant can fill it, a button. The drawing is
 * the page's own -- a folder for Blog and Reviews (EmptyFolder), a bin for Trash (EmptyTrash) --
 * and is told whether it is open.
 */
import { useState, type PointerEvent, type ReactNode } from "react";
import { Plus } from "lucide-react";

import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import { cn } from "@/lib/utils";

/** The springy ease every drawing moves with: a slight overshoot. */
export const SPRING = "cubic-bezier(0.34, 1.4, 0.64, 1)";

export type EmptyStateProps = {
  title: string;
  line?: string;
  /** The way to fill the list, where it makes sense: a page to open, or something on this one. */
  action?: { label: string } & ({ href: string } | { onClick: () => void });
  className?: string;
};

export function EmptyState({
  title,
  line,
  action,
  className,
  drawing,
  drawingClassName,
}: EmptyStateProps & {
  drawing: (open: boolean) => ReactNode;
  /** The drawing's size. */
  drawingClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const isMouse = (event: PointerEvent) => event.pointerType === "mouse";

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-card border border-card-border bg-card px-4 pb-12 pt-12 text-center",
        className
      )}
    >
      {/* A toy, not a control: a mouse brings it alive by hovering, a finger by tapping. */}
      <div
        aria-hidden
        onPointerEnter={(event) => isMouse(event) && setOpen(true)}
        onPointerLeave={(event) => isMouse(event) && setOpen(false)}
        onPointerUp={(event) => !isMouse(event) && setOpen((was) => !was)}
        className={cn("relative mb-8 cursor-pointer select-none", drawingClassName)}
      >
        {drawing(open)}
      </div>

      <p className="text-base font-medium text-foreground">{title}</p>
      {line ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{line}</p> : null}
      {action && "href" in action ? (
        <DeferredNavLink href={action.href} className={ACTION}>
          <ActionLabel label={action.label} />
        </DeferredNavLink>
      ) : action ? (
        <button type="button" onClick={action.onClick} className={ACTION}>
          <ActionLabel label={action.label} />
        </button>
      ) : null}
    </div>
  );
}

const ACTION =
  "group mt-6 inline-flex items-center gap-3 rounded-full border border-dashed border-muted-foreground/30 bg-background py-2.5 pl-3 pr-5 transition-colors hover:border-primary hover:bg-primary/5";

function ActionLabel({ label }: { label: string }) {
  return (
    <>
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Plus className="h-4 w-4" strokeWidth={3} aria-hidden />
      </span>
      <span className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">{label}</span>
    </>
  );
}
