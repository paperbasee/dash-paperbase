 "use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SettingsMessage = { type: "success" | "error"; text: string } | null;

export default function AccountSection({
  hidden,
  isLoading,
  ownerName,
  ownerEmail,
  onOwnerNameChange,
  onOwnerEmailChange,
  accountSaving,
  accountMessage,
  onSubmit,
}: {
  hidden: boolean;
  isLoading: boolean;
  ownerName: string;
  ownerEmail: string;
  onOwnerNameChange: Dispatch<SetStateAction<string>> | ((value: string) => void);
  onOwnerEmailChange: Dispatch<SetStateAction<string>> | ((value: string) => void);
  accountSaving: boolean;
  accountMessage: SettingsMessage;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <section
      id="panel-account"
      role="tabpanel"
      aria-labelledby="tab-account"
      hidden={hidden}
      className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
    >
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <form onSubmit={onSubmit} className="w-full max-w-6xl space-y-6">
          <h2 className="text-lg font-medium text-foreground">Account</h2>
          <p className="text-sm text-muted-foreground">Owner information for this store.</p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="owner_name" className="text-sm font-medium leading-normal text-foreground">
                Owner name
              </label>
              <Input
                id="owner_name"
                value={ownerName}
                onChange={(e) => onOwnerNameChange(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="owner_email" className="text-sm font-medium leading-normal text-foreground">
                Owner email
              </label>
              <Input
                id="owner_email"
                type="email"
                value={ownerEmail}
                onChange={(e) => onOwnerEmailChange(e.target.value)}
                placeholder="e.g. owner@yourstore.com"
                className="w-full"
              />
            </div>
          </div>

          {accountMessage && (
            <p
              className={
                accountMessage.type === "success" ? "text-sm text-green-600" : "text-sm text-destructive"
              }
            >
              {accountMessage.text}
            </p>
          )}

          <Button type="submit" disabled={accountSaving}>
            {accountSaving ? "Saving…" : "Save account settings"}
          </Button>
        </form>
      )}
    </section>
  );
}

