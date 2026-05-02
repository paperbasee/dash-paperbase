"use client";

import type { ReactNode } from "react";

import { SettingsSectionBody } from "../SettingsSectionBody";

type CustomizationShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function CustomizationShell({ title, description, children }: CustomizationShellProps) {
  return (
    <SettingsSectionBody>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </SettingsSectionBody>
  );
}
