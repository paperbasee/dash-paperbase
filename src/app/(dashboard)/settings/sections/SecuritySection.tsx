 "use client";

import { Input } from "@/components/ui/input";

export default function SecuritySection({ hidden }: { hidden: boolean }) {
  return (
    <section
      id="panel-security"
      role="tabpanel"
      aria-labelledby="tab-security"
      hidden={hidden}
      className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
    >
      <h2 className="text-lg font-medium text-foreground">Security</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Change password, manage 2FA, active sessions, and login activity.
      </p>

      <div className="w-full max-w-6xl space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Change Password</label>
          <Input type="password" placeholder="••••••••" disabled />
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" disabled className="rounded" />
          <label className="text-sm text-muted-foreground">Two-factor authentication (2FA)</label>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Active Sessions</label>
          <Input placeholder="View and manage sessions" disabled />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Login Activity</label>
          <Input placeholder="View login history" disabled />
        </div>
      </div>
    </section>
  );
}

