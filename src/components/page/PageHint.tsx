"use client";

import { useRef, useState, type ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Popover } from "radix-ui";

/** How the hint was last reached for: a mouse opens it by pointing, anything else by a tap or a key. */
type Reach = "mouse" | "other";

/**
 * The ? beside a page's title (owner, 2026-10-04): what the page is for, out of the way until asked.
 * A mouse opens it by pointing at it and closes it by moving away; a finger taps it open and taps
 * anywhere else to close it; a keyboard opens it with Enter and closes it with Esc. The words may
 * hold a link, which stays clickable -- so a pop-out, not a tooltip.
 */
export function PageHint({ children }: { children: ReactNode }) {
  const t = useTranslations("pages");
  const [open, setOpen] = useState(false);
  const reach = useRef<Reach>("other");
  const closing = useRef<number | undefined>(undefined);

  const stay = () => window.clearTimeout(closing.current);
  const point = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    reach.current = "mouse";
    stay();
    setOpen(true);
  };
  // A moment's grace, so the pointer can cross from the ? to the words.
  const leave = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    stay();
    closing.current = window.setTimeout(() => setOpen(false), 150);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        type="button"
        aria-label={t("aboutThisPage")}
        onPointerDown={(event) => {
          reach.current = event.pointerType === "mouse" ? "mouse" : "other";
        }}
        onKeyDown={() => {
          reach.current = "other";
        }}
        onPointerEnter={point}
        onPointerLeave={leave}
        // A mouse that pointed it open keeps it open on a click; the click is not a toggle.
        onClick={(event) => {
          if (reach.current === "mouse" && open) event.preventDefault();
        }}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:text-foreground"
      >
        <CircleHelp className="size-[18px]" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={16}
          onPointerEnter={(event) => event.pointerType === "mouse" && stay()}
          onPointerLeave={leave}
          // Pointed open, focus stays where it was; tapped or keyed open, it moves in, so a link inside is reachable.
          onOpenAutoFocus={(event) => {
            if (reach.current === "mouse") event.preventDefault();
          }}
          className="z-50 max-w-[min(22rem,calc(100vw-2rem))] rounded-popover border border-border-subtle bg-popover p-3.5 text-sm leading-relaxed text-popover-foreground outline-none [box-shadow:var(--shadow-popover)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="space-y-2">{children}</div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
