"use client";

import { Toaster } from "sonner";

export function NotificationViewport() {
  return (
    <Toaster
      position="top-center"
      closeButton
      expand
      visibleToasts={4}
      offset={16}
      gap={10}
      toastOptions={{
        classNames: {
          toast:
            "group w-[min(92vw,32rem)] border-none bg-transparent p-0 shadow-none transition-all duration-300 ease-out",
        },
      }}
    />
  );
}
