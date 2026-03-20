import { z } from "zod";

export const requiredString = (fieldName: string) =>
  z
    .string({ message: `${fieldName} is required.` })
    .trim()
    .min(1, `${fieldName} is required.`);

export const optionalTrimmedString = z.string().trim().optional().or(z.literal(""));

export const emailSchema = z
  .string({ message: "Email is required." })
  .trim()
  .min(1, "Email is required.")
  .email("Please enter a valid email address.");

export const phoneSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^01\d{9}$/.test(value), {
    message: "Phone number must start with 01 and be exactly 11 digits.",
  });

export const urlSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || z.string().url().safeParse(value).success,
    "Please enter a valid URL."
  );

export const passwordSchema = z
  .string({ message: "Password is required." })
  .min(8, "Password must be at least 8 characters.");

export const maxWords = (value: string, max: number) =>
  value.trim().split(/\s+/).filter(Boolean).length <= max;
