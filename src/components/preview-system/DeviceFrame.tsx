"use client";

import type { ReactNode } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreviewDevice, type DeviceType } from "./usePreviewDevice";

const DEVICES: { key: DeviceType; icon: typeof Monitor; label: string }[] = [
  { key: "mobile", icon: Smartphone, label: "Mobile" },
  { key: "tablet", icon: Tablet, label: "Tablet" },
  { key: "desktop", icon: Monitor, label: "Desktop" },
];

export function DeviceFrame({ children }: { children: ReactNode }) {
  const { device, setDevice, width } = usePreviewDevice();

  return (
    <div className="space-y-3">
      <div className="hidden sm:flex items-center gap-1 rounded-card bg-muted/60 p-1 w-fit">
        {DEVICES.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setDevice(key)}
            aria-label={label}
            className={cn(
              "flex items-center gap-1.5 rounded-ui px-2.5 py-1.5 text-xs font-medium transition-colors",
              device === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <div
        className="mx-auto overflow-hidden rounded-card border border-border bg-background transition-all duration-300"
        style={{ maxWidth: width }}
      >
        {children}
      </div>
    </div>
  );
}
