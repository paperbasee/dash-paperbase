import { z } from "zod";
import { emailSchema, maxWords, phoneSchema, requiredString } from "./common";
import { defaultValidationMessages, type ValidationMessages } from "./messages";

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
    language: z.enum(["en", "bn"]),
  });
}

export function buildAccountSettingsSchema(messages: ValidationMessages = defaultValidationMessages) {
  return z.object({
    ownerName: requiredString("Owner name", messages),
  });
}

export const storeUpdateSchema = buildStoreUpdateSchema();
export const accountSettingsSchema = buildAccountSettingsSchema();
