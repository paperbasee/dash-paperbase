"use client";

import { Search, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0"
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-background p-0 gap-0",
            "inset-0 rounded-none border-0 shadow-none",
            "md:inset-auto md:left-1/2 md:top-[35%] md:w-full md:max-w-xl md:-translate-x-1/2 md:-translate-y-1/2",
            "md:rounded-lg md:border md:border-border md:shadow-lg",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
          onEscapeKeyDown={() => onOpenChange(false)}
        >
          <Dialog.Title className="sr-only">Search</Dialog.Title>

          {/* Mobile: X on top row, search box full width on next row */}
          <div className="flex flex-col md:hidden">
            <div className="flex justify-end p-4 pb-0">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close search"
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </Button>
            </div>
            <div className="relative px-4 pt-3 pb-4">
              <Input
                placeholder="Search for items and brands"
                className={cn(
                  "h-12 w-full rounded-lg pr-10 pl-4",
                  "border-2 border-border bg-background focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                )}
                autoFocus
              />
              <Search className="absolute right-7 top-1/2 size-4 -translate-y-1/2 shrink-0 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Desktop: single row with icon left, input, esc */}
          <div className="hidden items-center gap-2 border-b border-border px-3 py-2 md:flex">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              placeholder="Search for items and brands"
              className="h-10 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
            <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              esc
            </kbd>
          </div>

          <div className="flex min-h-[240px] flex-1 items-center justify-center py-10 text-sm text-muted-foreground">
            No recent searches
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
