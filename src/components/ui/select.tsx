import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const selectVariants = cva(
  [
    "w-full min-w-0 appearance-none rounded-md border border-input bg-transparent text-sm shadow-xs",
    "transition-[color,box-shadow] outline-none",
    "text-foreground placeholder:text-muted-foreground",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")]",
    "bg-no-repeat bg-[right_0.5rem_center] pr-8",
  ],
  {
    variants: {
      size: {
        default: "h-9 px-3 py-1",
        sm: "h-7 px-2 py-0.5 text-xs",
        lg: "h-11 px-4 py-2",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface SelectProps
  extends Omit<React.ComponentProps<"select">, "size">,
    VariantProps<typeof selectVariants> {}

function Select({ className, size, ...props }: SelectProps) {
  return (
    <select
      data-slot="select"
      className={cn(selectVariants({ size }), className)}
      {...props}
    />
  )
}

export { Select, selectVariants }
