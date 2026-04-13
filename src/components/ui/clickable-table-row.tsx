"use client"

import * as React from "react"
import { useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { isNestedInteractiveTarget } from "@/lib/row-nav"

const rowNavClasses =
  "cursor-pointer hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

export type ClickableTableRowProps = Omit<
  React.ComponentProps<"tr">,
  "role" | "tabIndex" | "onClick" | "onKeyDown" | "aria-label"
> & {
  children: React.ReactNode
  /** Accessible name for the row action (destination or primary control). */
  "aria-label": string
  /** When true, renders a non-interactive row (e.g. while a row editor is open). */
  disabled?: boolean
} & (
  | { href: string; onNavigate?: never }
  | { href?: undefined; onNavigate: () => void }
)

export const ClickableTableRow = React.forwardRef<
  HTMLTableRowElement,
  ClickableTableRowProps
>(function ClickableTableRow(
  {
    children,
    className,
    "aria-label": ariaLabel,
    href,
    onNavigate,
    disabled = false,
    ...trProps
  },
  ref
) {
  const router = useRouter()

  const runNavigate = React.useCallback(() => {
    if (href) {
      router.push(href)
    } else if (onNavigate) {
      onNavigate()
    }
  }, [href, onNavigate, router])

  const handleClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    if (disabled) return
    if (isNestedInteractiveTarget(e.target)) return
    runNavigate()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (disabled) return
    if (e.key !== "Enter" && e.key !== " ") return
    if (isNestedInteractiveTarget(e.target)) return
    e.preventDefault()
    runNavigate()
  }

  const role = href ? "link" : "button"

  if (disabled) {
    return (
      <tr
        ref={ref}
        {...trProps}
        className={cn("hover:bg-muted/40", className)}
        aria-disabled
      >
        {children}
      </tr>
    )
  }

  return (
    <tr
      ref={ref}
      {...trProps}
      role={role}
      tabIndex={0}
      aria-label={ariaLabel}
      className={cn(rowNavClasses, className)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </tr>
  )
})

/** Marks a subtree so clicks do not trigger parent row navigation. */
export function RowNavIgnore({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-row-nav-ignore className={className} {...props} />
}
