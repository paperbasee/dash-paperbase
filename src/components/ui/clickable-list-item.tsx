"use client"

import * as React from "react"
import { useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { isNestedInteractiveTarget } from "@/lib/row-nav"

const listItemNavClasses =
  "cursor-pointer rounded-ui hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

export type ClickableListItemProps = Omit<
  React.ComponentProps<"li">,
  "role" | "tabIndex" | "onClick" | "onKeyDown" | "aria-label"
> & {
  children: React.ReactNode
  "aria-label": string
  disabled?: boolean
} & (
  | { href: string; onNavigate?: never }
  | { href?: undefined; onNavigate: () => void }
)

export function ClickableListItem({
  children,
  className,
  "aria-label": ariaLabel,
  href,
  onNavigate,
  disabled = false,
  ...liProps
}: ClickableListItemProps) {
  const router = useRouter()

  const runNavigate = React.useCallback(() => {
    if (href) router.push(href)
    else onNavigate?.()
  }, [href, onNavigate, router])

  const handleClick = (e: React.MouseEvent<HTMLLIElement>) => {
    if (disabled) return
    if (isNestedInteractiveTarget(e.target)) return
    runNavigate()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLLIElement>) => {
    if (disabled) return
    if (e.key !== "Enter" && e.key !== " ") return
    if (isNestedInteractiveTarget(e.target)) return
    e.preventDefault()
    runNavigate()
  }

  const role = href ? "link" : "button"

  if (disabled) {
    return (
      <li {...liProps} className={cn("pointer-events-none opacity-60", className)}>
        {children}
      </li>
    )
  }

  return (
    <li
      {...liProps}
      role={role}
      tabIndex={0}
      aria-label={ariaLabel}
      className={cn(listItemNavClasses, className)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </li>
  )
}
