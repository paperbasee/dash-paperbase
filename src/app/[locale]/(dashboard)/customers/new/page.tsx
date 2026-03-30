"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Undo2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const fieldControlClass = "w-full rounded-lg bg-muted/50";

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
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    setSuccessMessage("");
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccessMessage(tPages("customerNewSuccess"));
    } catch {
      setError(tPages("customerNewError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted/80 px-1 py-1 hidden md:block">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={tPages("customerNewBackAria")}
              onClick={() => router.back()}
              className="shrink-0"
            >
              <Undo2 className="size-4" />
            </Button>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {tPages("customerNewTitle")}
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
              {tPages("customerNewInfoTitle")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{tPages("customerNewInfoHint")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label={tPages("customerNewName")} required>
              <Input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={tPages("customerNewNamePlaceholder")}
                className={fieldControlClass}
              />
            </Field>
            <Field label={tPages("customerNewEmail")} required>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="customer@example.com"
                className={fieldControlClass}
              />
            </Field>
            <Field label={tPages("customerNewPhone")} required>
              <Input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="01XXXXXXXXX"
                className={fieldControlClass}
              />
            </Field>
            <Field label={tPages("customerNewAddress")}>
              <Textarea
                rows={3}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder={tPages("customerNewAddressPlaceholder")}
                className={fieldControlClass}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={saving} className="gap-2">
            <Plus className="size-4" />
            {saving ? tCommon("saving") : tPages("customerNewTitle")}
          </Button>
        </div>
      </form>
    </div>
  );
}
