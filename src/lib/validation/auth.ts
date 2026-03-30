import { z } from "zod";
import { emailSchema, passwordSchema } from "./common";
import { defaultValidationMessages, type ValidationMessages } from "./messages";

export function buildLoginSchema(messages: ValidationMessages = defaultValidationMessages) {
  return z.object({
    email: emailSchema(messages),
    password: z.string({ message: messages.passwordRequired }).min(1, messages.passwordRequired),
  });
}

export function buildRegisterSchema(messages: ValidationMessages = defaultValidationMessages) {
  return z
    .object({
      email: emailSchema(messages),
      password: passwordSchema(messages),
      passwordConfirm: passwordSchema(messages),
    })
    .refine((data) => data.password === data.passwordConfirm, {
      message: messages.passwordsMismatch,
      path: ["passwordConfirm"],
    });
}

export function buildPasswordResetConfirmSchema(
  messages: ValidationMessages = defaultValidationMessages
) {
  return z
    .object({
      newPassword: passwordSchema(messages),
      newPasswordConfirm: passwordSchema(messages),
    })
    .refine((data) => data.newPassword === data.newPasswordConfirm, {
      message: messages.passwordsMismatch,
      path: ["newPasswordConfirm"],
    });
}

export const loginSchema = buildLoginSchema();
export const registerSchema = buildRegisterSchema();
export const passwordResetConfirmSchema = buildPasswordResetConfirmSchema();
