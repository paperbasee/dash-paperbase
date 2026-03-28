import { z } from "zod";

export const orderItemSchema = z.object({
  product_public_id: z.string().trim().min(1),
  /** Matches dashboard line items (`variant_public_id`). **/
  variant_public_id: z.string().trim().min(1).nullable(),
  quantity: z.number().int().min(1),
  price: z.string().trim().min(1),
});

export const orderCreateSchema = z.object({
  shipping_name: z.string().trim().min(1, "Shipping name is required."),
  phone: z.string().trim().min(1, "Phone is required."),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .optional()
    .or(z.literal("")),
  shipping_address: z.string().trim().min(1, "Shipping address is required."),
  district: z.string().trim().min(1, "District is required."),
  shipping_zone_public_id: z.string().trim().min(1, "Delivery zone is required."),
  shipping_method_public_id: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "Add at least one product to the order."),
});
