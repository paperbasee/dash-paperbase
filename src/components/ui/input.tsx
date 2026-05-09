import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  [
    "w-full min-w-0 rounded-xs border border-input-border bg-input-surface text-base text-foreground [box-shadow:var(--shadow-input)]",
    "[color-scheme:dark] dark:[-webkit-text-fill-color:hsl(var(--foreground))]",
    "transition-[background-color,border-color,box-shadow,color] duration-[180ms] ease-in-out outline-none",
    "selection:bg-primary selection:text-primary-foreground",
    "placeholder:text-muted-foreground placeholder:[-webkit-text-fill-color:hsl(var(--muted-foreground))]",
    "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "hover:border-border",
    "focus-visible:border-ring focus-visible:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/20",
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

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(inputVariants({ size }), className)}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input, inputVariants }
