import { z } from "zod";
import { emailSchema, maxWords, phoneSchema, requiredString } from "./common";
import { defaultValidationMessages, type ValidationMessages } from "./messages";

export function buildStoreCreateSchema(messages: ValidationMessages = defaultValidationMessages) {
  const email = emailSchema(messages);
  return z.object({
    name: requiredString("Store name", messages),
    store_type: z
      .string()
      .trim()
      .refine((value) => value === "" || maxWords(value, 4), messages.storeTypeMaxWords),
    owner_first_name: requiredString("First name", messages),
    owner_last_name: requiredString("Last name", messages),
    owner_email: email,
    phone: phoneSchema(messages).optional(),
    contact_email: z
      .string()
      .trim()
      .refine((value) => value === "" || email.safeParse(value).success, {
        message: messages.contactEmailInvalid,
      })
      .optional(),
    address: z.string().trim().optional(),
  });
}

export function buildStoreUpdateSchema(messages: ValidationMessages = defaultValidationMessages) {
  const email = emailSchema(messages);
  return z.object({
    storeName: requiredString("Store name", messages),
    storeType: z
      .string()
      .trim()
      .refine((value) => value === "" || maxWords(value, 4), messages.storeTypeMaxWords),
    contactEmail: z
      .string()
      .trim()
      .refine((value) => value === "" || email.safeParse(value).success, {
        message: messages.contactEmailInvalid,
      }),
    phone: phoneSchema(messages),
    address: z.string().trim(),
  });
}

export function buildAccountSettingsSchema(messages: ValidationMessages = defaultValidationMessages) {
  return z.object({
    ownerName: requiredString("Owner name", messages),
  });
}

export const storeCreateSchema = buildStoreCreateSchema();
export const storeUpdateSchema = buildStoreUpdateSchema();
export const accountSettingsSchema = buildAccountSettingsSchema();

/** Exact phrase required in the delete-store confirmation modal (trimmed before compare). */
export const DELETE_STORE_CONFIRM_PHRASE = "delete my store";

/** Exact phrase for remove-store (reversible deactivation). */
export const REMOVE_STORE_CONFIRM_PHRASE = "remove my store";

export function isDeleteStoreModalPhraseConfirmed(value: string): boolean {
  return value.trim() === DELETE_STORE_CONFIRM_PHRASE;
}

export function isRemoveStoreModalPhraseConfirmed(value: string): boolean {
  return value.trim() === REMOVE_STORE_CONFIRM_PHRASE;
}

/** Must match the active store name exactly (same rules as backend `store.name` vs request body). */
export function isDeleteStoreModalStoreNameConfirmed(
  value: string,
  expectedStoreName: string,
): boolean {
  const expected = expectedStoreName.trim();
  if (!expected) return false;
  return value.trim() === expected;
}
