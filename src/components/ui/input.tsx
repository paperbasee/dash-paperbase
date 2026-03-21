import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  [
    "w-full min-w-0 rounded-md border border-border bg-background text-base text-foreground shadow-xs",
    "transition-[color,box-shadow] outline-none",
    "selection:bg-primary selection:text-primary-foreground",
    "placeholder:text-muted-foreground",
    "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
    "md:text-sm dark:aria-invalid:ring-destructive/40",
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

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {}

function Input({ className, type, size, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ size }), className)}
      {...props}
    />
  )
}

export { Input, inputVariants }
