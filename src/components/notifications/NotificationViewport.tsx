"use client";

import { Toaster } from "sonner";

export function NotificationViewport() {
  return (
    <Toaster
      position="bottom-right"
      closeButton={false}
      expand
      duration={5000}
      visibleToasts={4}
      gap={12}
      containerAriaLabel="Notifications"
      style={{
        zIndex: 70,
        bottom: "2rem",
        right:
          "calc((max(0px, calc(100vw - var(--dashboard-main-left-inset) - var(--dashboard-content-max-width))) / 2) + var(--dashboard-content-inline-padding))",
      }}
      toastOptions={{
        classNames: {
          toast:
            "group w-[min(92vw,22rem)] sm:w-[22rem] border-none bg-transparent p-0 shadow-none transition-all duration-300 ease-out",
        },
      }}
    />
  );
}
