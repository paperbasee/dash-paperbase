import { z } from "zod";
import { emailSchema, maxWords, phoneSchema, requiredString } from "./common";

export const storeCreateSchema = z.object({
  name: requiredString("Store name"),
  store_type: z
    .string()
    .trim()
    .refine((value) => value === "" || maxWords(value, 4), "Store type must be at most 4 words."),
  owner_first_name: requiredString("First name"),
  owner_last_name: requiredString("Last name"),
  owner_email: emailSchema,
  phone: phoneSchema.optional(),
  contact_email: z
    .string()
    .trim()
    .refine((value) => value === "" || emailSchema.safeParse(value).success, {
      message: "Please enter a valid contact email.",
    })
    .optional(),
  address: z.string().trim().optional(),
});

export const storeUpdateSchema = z.object({
  storeName: requiredString("Store name"),
  storeType: z
    .string()
    .trim()
    .refine((value) => value === "" || maxWords(value, 4), "Store type must be at most 4 words."),
  contactEmail: z
    .string()
    .trim()
    .refine((value) => value === "" || emailSchema.safeParse(value).success, {
      message: "Please enter a valid contact email.",
    }),
  phone: phoneSchema,
  address: z.string().trim(),
});

export const accountSettingsSchema = z.object({
  ownerName: requiredString("Owner name"),
  ownerEmail: emailSchema,
});

export const deleteStoreConfirmSchema = z.object({
  accountEmail: z.string().trim().email(),
  storeName: requiredString("Store name"),
});

export function validateDeleteStoreConfirmation(input: {
  emailInput: string;
  storeNameInput: string;
  ownerEmail: string;
  storeName: string;
}): { success: true } | { success: false; error: string } {
  const parsed = deleteStoreConfirmSchema.safeParse({
    accountEmail: input.emailInput,
    storeName: input.storeNameInput,
  });
  if (!parsed.success) {
    return { success: false, error: "Enter a valid email and store name to confirm." };
  }

  const normalizedEmail = parsed.data.accountEmail.toLowerCase();
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const normalizedStoreName = parsed.data.storeName;
  const storeName = input.storeName.trim();

  if (normalizedEmail !== ownerEmail || normalizedStoreName !== storeName) {
    return {
      success: false,
      error: "Email and store name must exactly match before deletion.",
    };
  }

  return { success: true };
}
