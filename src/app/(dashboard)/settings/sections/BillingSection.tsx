 "use client";

import { Input } from "@/components/ui/input";

export default function BillingSection({ hidden }: { hidden: boolean }) {
  return (
    <section
      id="panel-billing"
      role="tabpanel"
      aria-labelledby="tab-billing"
      hidden={hidden}
      className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
    >
      <h2 className="text-lg font-medium text-foreground">Billing & Plan</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Current plan, upgrade/downgrade, usage (API, storage), and payment history.
      </p>

      <div className="w-full max-w-6xl space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Current Plan</label>
          <Input placeholder="View your plan" disabled />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Usage</label>
          <Input placeholder="API calls, storage, etc." disabled />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Payment History</label>
          <Input placeholder="View invoices and payments" disabled />
        </div>
      </div>
    </section>
  );
}

