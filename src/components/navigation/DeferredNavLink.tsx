"use client";

import {
  forwardRef,
  type ComponentProps,
  type MouseEvent,
} from "react";
import { Link } from "@/i18n/navigation";
import { useDeferredNavigate } from "@/hooks/useDeferredNavigate";
import { normalizeNavigationHref } from "@/lib/navigation/normalize-navigation-href";

type DeferredNavLinkProps = ComponentProps<typeof Link> & {
  onNavigate?: () => void;
};

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

export const DeferredNavLink = forwardRef<HTMLAnchorElement, DeferredNavLinkProps>(
  function DeferredNavLink(
    { href, onClick, onNavigate, ...props },
    ref
  ) {
    const navigate = useDeferredNavigate();
    const hrefString = typeof href === "string" ? href : String(href);

    return (
      <Link
        ref={ref}
        href={href}
        {...props}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          if (isModifiedClick(event)) return;

          event.preventDefault();
          const normalized = normalizeNavigationHref(hrefString);
          navigate(normalized);
          onNavigate?.();
        }}
      />
    );
  }
);
