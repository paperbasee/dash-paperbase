"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Undo2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtraFieldsFormSection } from "@/components/ExtraFieldsFormSection";
import { useExtraFieldsSchema } from "@/hooks/useExtraFieldsSchema";
import type { ExtraFieldValues } from "@/types/extra-fields";
import { validateRequiredExtraFields } from "@/lib/validation";

const inputClass =
  "input w-full rounded-lg bg-muted/50 border-border focus:ring-2 focus:ring-ring focus:ring-offset-0";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
    </div>
  );
}

export default function NewCustomerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [extraFields, setExtraFields] = useState<ExtraFieldValues>({});
  const [extraFieldsErrors, setExtraFieldsErrors] = useState<Record<string, string>>({});
  const { schema: extraFieldsSchema } = useExtraFieldsSchema("customer");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const schemaWithNames = extraFieldsSchema.filter((f) => f.name.trim());
    const extraErrors = validateRequiredExtraFields(schemaWithNames, extraFields);
    if (Object.keys(extraErrors).length > 0) {
      setExtraFieldsErrors(extraErrors);
      setError("Please fill in all required extra fields.");
      return;
    }
    setExtraFieldsErrors({});
    setError("");

    setSaving(true);
    setSuccessMessage("");
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccessMessage("Backend integration coming soon. Data stored locally.");
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted/80 px-1 py-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Back to customers"
              onClick={() => router.back()}
              className="shrink-0"
            >
              <Undo2 className="size-4" />
            </Button>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Add Customer
          </h1>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400"
        >
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Customer Information
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Basic customer details. Backend integration coming soon.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Name" required>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Customer name"
                className={inputClass}
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="customer@example.com"
                className={inputClass}
              />
            </Field>
            <Field label="Phone" required>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="01XXXXXXXXX"
                className={inputClass}
              />
            </Field>
            <Field label="Address">
              <textarea
                rows={3}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Full address"
                className={inputClass}
              />
            </Field>
          </CardContent>
        </Card>

        {extraFieldsSchema.some((f) => f.name.trim()) && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">
                Extra Fields
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Custom fields defined in Settings → Dynamic Fields.
              </p>
            </CardHeader>
            <CardContent>
              <ExtraFieldsFormSection
                entityType="customer"
                values={extraFields}
                onChange={setExtraFields}
                errors={extraFieldsErrors}
              />
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="gap-2">
            <Plus className="size-4" />
            {saving ? "Saving..." : "Add Customer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
