import { z } from "zod";
import type { ExtraFieldDefinition, ExtraFieldValues } from "@/types/extra-fields";

export function slugFromName(name: string): string {
  if (!name.trim()) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export const productCreateSchema = z.object({
  name: z.string().trim().min(1, "Product name is required."),
  brand: z.string().optional(),
  price: z.string().trim().min(1, "Price is required."),
  category: z.string().trim().min(1, "Category is required."),
  stock: z.string().trim().min(1, "Stock is required."),
  description: z.string().optional(),
  original_price: z.string().optional(),
  is_active: z.boolean(),
});

export const productUpdateSchema = productCreateSchema;

export function validateRequiredExtraFields(
  schema: { name: string; required: boolean }[],
  values: ExtraFieldValues
): Record<string, string> {
  const requiredSchema = z.object(
    Object.fromEntries(
      schema.map((field) => [
        field.name,
        field.required
          ? z.union([z.string().trim().min(1), z.number(), z.boolean()])
          : z.union([z.string(), z.number(), z.boolean()]).optional(),
      ])
    )
  );

  const result = requiredSchema.safeParse(values);
  if (result.success) return {};

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !errors[key]) {
      errors[key] = "This field is required.";
    }
  }
  return errors;
}

export function validateExtraFieldDefinitions(
  schema: ExtraFieldDefinition[]
):
  | { success: true; data: ExtraFieldDefinition[] }
  | { success: false; error: string } {
  const complete = schema.filter((f) => f.name.trim() !== "");
  const hasIncomplete = schema.some((f) => f.name.trim() === "");
  if (hasIncomplete) {
    return { success: false, error: "Complete all fields (add a name) before saving." };
  }

  const entityTypes = [...new Set(complete.map((f) => f.entityType))];
  const hasDuplicates = entityTypes.some((entityType) => {
    const names = new Set<string>();
    for (const field of complete.filter((f) => f.entityType === entityType)) {
      const normalized = field.name.trim().toLowerCase().replace(/\s+/g, "_");
      if (names.has(normalized)) return true;
      names.add(normalized);
    }
    return false;
  });

  if (hasDuplicates) {
    return {
      success: false,
      error: "Field names must be unique within each entity type.",
    };
  }

  return { success: true, data: complete };
}
