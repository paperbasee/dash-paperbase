import type { z } from "zod";

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string> };

export function parseValidation<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  data: unknown
): ValidationResult<z.infer<TSchema>> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    const key = typeof field === "string" ? field : "form";
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }

  return { success: false, errors };
}
