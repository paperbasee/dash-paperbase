import { describe, expect, it } from "vitest";
import {
  accountSettingsSchema,
  storeCreateSchema,
  validateDeleteStoreConfirmation,
} from "@/lib/validation/store";

describe("store validation", () => {
  it("validates store creation payload", () => {
    const result = storeCreateSchema.safeParse({
      name: "My Shop",
      store_type: "Fashion Retail",
      owner_first_name: "Mahi",
      owner_last_name: "Hasan",
      owner_email: "mahi@example.com",
      phone: "01712345678",
      contact_email: "support@example.com",
      address: "Dhaka",
    });
    expect(result.success).toBe(true);
  });

  it("rejects account settings with invalid email", () => {
    const result = accountSettingsSchema.safeParse({
      ownerName: "Mahi Hasan",
      ownerEmail: "invalid-email",
    });
    expect(result.success).toBe(false);
  });

  it("validates delete confirmation strict match", () => {
    const ok = validateDeleteStoreConfirmation({
      emailInput: "owner@example.com",
      storeNameInput: "My Store",
      ownerEmail: "owner@example.com",
      storeName: "My Store",
    });
    expect(ok.success).toBe(true);

    const fail = validateDeleteStoreConfirmation({
      emailInput: "owner@example.com",
      storeNameInput: "my store",
      ownerEmail: "owner@example.com",
      storeName: "My Store",
    });
    expect(fail.success).toBe(false);
  });
});
