import { describe, expect, it } from "vitest";
import {
  accountSettingsSchema,
  DELETE_STORE_CONFIRM_PHRASE,
  REMOVE_STORE_CONFIRM_PHRASE,
  isDeleteStoreModalPhraseConfirmed,
  isDeleteStoreModalStoreNameConfirmed,
  isRemoveStoreModalPhraseConfirmed,
  storeCreateSchema,
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

  it("rejects account settings with empty owner name", () => {
    const result = accountSettingsSchema.safeParse({
      ownerName: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts delete modal phrase with trim", () => {
    expect(isDeleteStoreModalPhraseConfirmed(`  ${DELETE_STORE_CONFIRM_PHRASE}  `)).toBe(true);
  });

  it("rejects wrong delete modal phrase", () => {
    expect(isDeleteStoreModalPhraseConfirmed("delete my project")).toBe(false);
    expect(isDeleteStoreModalPhraseConfirmed("DELETE MY STORE")).toBe(false);
  });

  it("accepts delete modal store name with trim", () => {
    expect(isDeleteStoreModalStoreNameConfirmed("  Pet Care  ", "Pet Care")).toBe(true);
  });

  it("rejects wrong delete modal store name", () => {
    expect(isDeleteStoreModalStoreNameConfirmed("PetCare", "Pet Care")).toBe(false);
    expect(isDeleteStoreModalStoreNameConfirmed("x", "")).toBe(false);
  });

  it("accepts remove modal phrase with trim", () => {
    expect(isRemoveStoreModalPhraseConfirmed(`  ${REMOVE_STORE_CONFIRM_PHRASE}  `)).toBe(true);
  });

  it("rejects wrong remove modal phrase", () => {
    expect(isRemoveStoreModalPhraseConfirmed("remove my shop")).toBe(false);
  });
});
