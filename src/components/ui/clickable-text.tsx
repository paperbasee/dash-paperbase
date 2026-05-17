"use client";

import * as React from "react";
import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import { cn } from "@/lib/utils";

const variantClass = {
  default:
    "font-medium text-primary underline decoration-primary/80 underline-offset-4 hover:decoration-primary",
  destructive:
    "font-medium text-destructive underline decoration-destructive/80 underline-offset-4 hover:decoration-destructive",
  muted:
    "font-medium text-foreground underline decoration-foreground/50 underline-offset-4 hover:decoration-foreground",
} as const;

export type ClickableTextProps = {
  className?: string;
  variant?: keyof typeof variantClass;
  /** Narrow overflow for table cells */
  truncate?: boolean;
  children: React.ReactNode;
} & (
  | ({ href: string } & Omit<
      React.ComponentProps<typeof DeferredNavLink>,
      "className" | "children" | "href"
    >)
  | ({ href?: undefined } & React.ButtonHTMLAttributes<HTMLButtonElement>)
);

function ClickableText(props: ClickableTextProps) {
  const { className, variant = "default", truncate, children } = props;
  const cls = cn(
    "inline cursor-pointer",
    variantClass[variant],
    truncate && "min-w-0 max-w-xs truncate",
    className
  );

  if ("href" in props && props.href != null) {
    const { variant: _v, truncate: _t, className: _c, href, ...linkProps } =
      props as Extract<ClickableTextProps, { href: string }>;
    return (
      <DeferredNavLink href={href} {...linkProps} className={cls}>
        {children}
      </DeferredNavLink>
    );
  }

  const { variant: _v, truncate: _t, className: _c, ...buttonProps } =
    props as Extract<ClickableTextProps, { href?: undefined }>;
  return (
    <button
      type="button"
      className={cn(cls, "border-0 bg-transparent p-0 text-left")}
      {...buttonProps}
    >
      {children}
    </button>
  );
}

export { ClickableText };
