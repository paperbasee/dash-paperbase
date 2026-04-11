"use client";

import { useExtraFieldsSchema } from "@/hooks/useExtraFieldsSchema";
import type { ExtraFieldEntityType, ExtraFieldValues } from "@/types/extra-fields";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const fieldControlClass = "w-full rounded-card bg-muted/50";

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

export function ExtraFieldsFormSection({
  entityType,
  values,
  onChange,
  errors = {},
}: {
  entityType: ExtraFieldEntityType;
  values: ExtraFieldValues;
  onChange: (values: ExtraFieldValues) => void;
  errors?: Record<string, string>;
}) {
  const { schema } = useExtraFieldsSchema(entityType);

  const sortedSchema = [...schema]
    .filter((f) => f.name.trim())
    .sort((a, b) => a.order - b.order);

  if (sortedSchema.length === 0) return null;

  const handleChange = (name: string, value: string | number | boolean) => {
    onChange({ ...values, [name]: value });
  };

  return (
    <div className="space-y-4">
      {sortedSchema.map((field) => {
        const value = values[field.name];
        const error = errors[field.name];

        return (
          <Field
            key={field.id}
            label={field.name || "(unnamed)"}
            required={field.required}
            error={error}
          >
            {field.fieldType === "text" && (
              <Input
                type="text"
                value={typeof value === "string" ? value : ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.defaultValue ?? ""}
                className={cn(fieldControlClass, error && "border-destructive")}
              />
            )}
            {field.fieldType === "number" && (
              <Input
                type="number"
                step="any"
                value={
                  value === undefined || value === null || value === ""
                    ? (field.defaultValue ?? "")
                    : Number(value)
                }
                onChange={(e) => {
                  const v = e.target.value;
                  handleChange(field.name, v === "" ? "" : Number(v));
                }}
                placeholder={field.defaultValue ?? ""}
                className={cn(
                  fieldControlClass,
                  error && "border-destructive font-numbers"
                )}
              />
            )}
            {field.fieldType === "boolean" && (
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={value === true}
                  onChange={(e) => handleChange(field.name, e.target.checked)}
                  className="form-checkbox"
                />
                <span className="text-sm text-muted-foreground">
                  {field.defaultValue || "Yes / No"}
                </span>
              </label>
            )}
            {field.fieldType === "dropdown" && (
              <Select
                value={typeof value === "string" ? value : ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className={cn(fieldControlClass, error && "border-destructive")}
              >
                <option value="">
                  {field.required ? "Select..." : "(Optional)"}
                </option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        );
      })}
    </div>
  );
}
