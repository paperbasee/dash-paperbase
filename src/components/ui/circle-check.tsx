import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/** A tick in a green circle: a line of what a plan gives (the Plans page's cards, Settings > Billing). */
export function CircleCheck({ className }: { className?: string }) {
  return (
    <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-white", className)} aria-hidden>
      <Check className="size-3" strokeWidth={3} />
    </span>
  );
}
