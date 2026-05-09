import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-xs border border-input-border bg-input-surface px-3 py-2 text-base text-foreground [box-shadow:var(--shadow-input)] transition-[background-color,border-color,box-shadow,color] duration-[180ms] ease-in-out outline-none placeholder:text-muted-foreground placeholder:[-webkit-text-fill-color:hsl(var(--muted-foreground))] hover:border-border focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
