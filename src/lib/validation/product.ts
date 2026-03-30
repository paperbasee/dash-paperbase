import { z } from "zod";
import type { ExtraFieldDefinition, ExtraFieldValues } from "@/types/extra-fields";
import { defaultValidationMessages, type ValidationMessages } from "./messages";

export function slugFromName(name: string): string {
  if (!name.trim()) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function buildProductCreateSchema(messages: ValidationMessages = defaultValidationMessages) {
  return z.object({
    name: z.string().trim().min(1, messages.productNameRequired),
    brand: z.string().optional(),
    price: z.string().trim().min(1, messages.productPriceRequired),
    category: z.string().trim().min(1, messages.productCategoryRequired),
    stock: z.string().trim().min(1, messages.productStockRequired),
    description: z.string().optional(),
    original_price: z.string().optional(),
    is_active: z.boolean(),
  });
}

export const productCreateSchema = buildProductCreateSchema();
export const productUpdateSchema = productCreateSchema;

export function validateRequiredExtraFields(
  schema: { name: string; required: boolean }[],
  values: ExtraFieldValues,
  messages: ValidationMessages = defaultValidationMessages
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
      errors[key] = messages.extraFieldRequired;
    }
  }
  return errors;
}

export function validateExtraFieldDefinitions(
  schema: ExtraFieldDefinition[],
  messages: ValidationMessages = defaultValidationMessages
):
  | { success: true; data: ExtraFieldDefinition[] }
  | { success: false; error: string } {
  const complete = schema.filter((f) => f.name.trim() !== "");
  const hasIncomplete = schema.some((f) => f.name.trim() === "");
  if (hasIncomplete) {
    return { success: false, error: messages.extraFieldsIncomplete };
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
      error: messages.extraFieldsDuplicateName,
    };
  }

  return { success: true, data: complete };
}
