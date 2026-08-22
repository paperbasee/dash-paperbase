"use client";

import { KeyRound, ShieldCheck } from "lucide-react";

import { SettingsSectionBody } from "../SettingsSectionBody";

/**
 * Sign-in is passwordless (passkeys + email magic-links), so there is no
 * password to change and no separate TOTP to manage. Passkeys are managed per
 * account under Settings → Account, so this section just explains the model.
 */
export default function SecuritySection({ hidden }: { hidden: boolean }) {
  if (hidden) return null;

  return (
    <SettingsSectionBody>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Security</h2>
        <p className="text-sm text-muted-foreground">
          Your store uses passwordless sign-in.
        </p>
      </div>

      <div className="rounded-card border border-border bg-background p-6 space-y-4">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-500" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Phishing-resistant by design</p>
            <p className="text-sm text-muted-foreground">
              Everyone signs in with passkeys — bound to your device (Touch ID,
              Windows Hello, or a security key). There are no passwords to steal
              or reset.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <KeyRound size={20} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Manage your passkeys</p>
            <p className="text-sm text-muted-foreground">
              Add, rename, or remove passkeys under{" "}
              <span className="font-medium text-foreground">Settings → Account</span>.
              Keep at least two (e.g. your laptop and your phone) so you&apos;re
              never locked out.
            </p>
          </div>
        </div>
      </div>
    </SettingsSectionBody>
  );
}
