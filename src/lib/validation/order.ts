import { z } from "zod";

export const orderItemSchema = z.object({
  product_id: z.string().trim().min(1),
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
    .min(1, "Email is required.")
    .email("Please enter a valid email address."),
  shipping_address: z.string().trim().min(1, "Shipping address is required."),
  district: z.string().trim().min(1, "District is required."),
  delivery_area: z.string().trim().min(1, "Delivery area is required."),
  tracking_number: z.string().trim().optional(),
  shipping_zone: z.string().optional(),
  shipping_method: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "Add at least one product to the order."),
});
