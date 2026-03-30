import { z } from "zod";
import { defaultValidationMessages, type ValidationMessages } from "./messages";

export const requiredString = (fieldName: string, messages: ValidationMessages = defaultValidationMessages) =>
  z
    .string({ message: messages.requiredField(fieldName) })
    .trim()
    .min(1, messages.requiredField(fieldName));

export const optionalTrimmedString = z.string().trim().optional().or(z.literal(""));

export const emailSchema = (messages: ValidationMessages = defaultValidationMessages) =>
  z
  .string({ message: messages.emailRequired })
  .trim()
  .min(1, messages.emailRequired)
  .email(messages.emailInvalid);

export const phoneSchema = (messages: ValidationMessages = defaultValidationMessages) =>
  z
  .string()
  .trim()
  .refine((value) => value === "" || /^01\d{9}$/.test(value), {
    message: messages.phoneInvalid,
  });

export const urlSchema = (messages: ValidationMessages = defaultValidationMessages) =>
  z
  .string()
  .trim()
  .refine(
    (value) => value === "" || z.string().url().safeParse(value).success,
    messages.urlInvalid
  );

export const passwordSchema = (messages: ValidationMessages = defaultValidationMessages) =>
  z
  .string({ message: messages.passwordRequired })
  .min(8, messages.passwordMinLength);

export const maxWords = (value: string, max: number) =>
  value.trim().split(/\s+/).filter(Boolean).length <= max;
