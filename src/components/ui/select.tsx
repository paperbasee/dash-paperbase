import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const selectVariants = cva(
  [
    "w-full min-w-0 appearance-none rounded-ui border border-border bg-background text-sm text-foreground shadow-xs",
    "transition-[color,box-shadow] outline-none",
    "placeholder:text-muted-foreground",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "bg-no-repeat pr-8",
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
    <div className={cn("relative w-full min-w-0", className)}>
      <select
        data-slot="select"
        className={cn(selectVariants({ size }), "w-full")}
        {...props}
      />
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  )
}

export { Select, selectVariants }
