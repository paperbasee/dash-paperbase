"use client";

import { Button } from "@/components/ui/button";

export function NotFoundBackButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={() => window.history.back()}
    >
      {label}
    </Button>
  );
}

