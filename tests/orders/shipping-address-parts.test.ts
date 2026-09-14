import { describe, expect, it } from "vitest";
import {
  joinVillageThanaDistrict,
  splitShippingAddressForForm,
} from "@/lib/orders/shipping-address-parts";

/**
 * Stored shapes of Order.shipping_address:
 * - storefront minimal checkout: "thana"
 * - storefront extended checkout: "address line, thana" (the line may contain commas)
 * - dashboard: "village, thana, district"
 * The district always lives in its own field, so it is never guessed from position.
 */
const CASES: Array<{
  name: string;
  address: string;
  district: string;
  want: { village: string; thana: string };
}> = [
  {
    name: "minimal checkout keeps the only part as the thana",
    address: "Mirpur",
    district: "Dhaka",
    want: { village: "", thana: "Mirpur" },
  },
  {
    name: "a one-part thana equal to the district stays the thana",
    address: "Dhaka",
    district: "Dhaka",
    want: { village: "", thana: "Dhaka" },
  },
  {
    name: "extended checkout splits into address line and thana",
    address: "House 12 Road 5, Mirpur",
    district: "Dhaka",
    want: { village: "House 12 Road 5", thana: "Mirpur" },
  },
  {
    name: "extended checkout with commas in the address line keeps the thana last",
    address: "House 12, Road 5, Mirpur",
    district: "Dhaka",
    want: { village: "House 12, Road 5", thana: "Mirpur" },
  },
  {
    name: "dashboard format drops the trailing district",
    address: "House 12, Mirpur, Dhaka",
    district: "Dhaka",
    want: { village: "House 12", thana: "Mirpur" },
  },
  {
    name: "two parts whose last part is the district",
    address: "44 Mirpur DOHS, Khulna",
    district: "Khulna",
    want: { village: "", thana: "44 Mirpur DOHS" },
  },
  {
    name: "no district never guesses one from position",
    address: "a, b, c",
    district: "",
    want: { village: "a, b", thana: "c" },
  },
  {
    name: "empty address",
    address: "",
    district: "",
    want: { village: "", thana: "" },
  },
];

describe("splitShippingAddressForForm", () => {
  for (const c of CASES) {
    it(c.name, () => {
      expect(splitShippingAddressForForm(c.address, c.district)).toEqual(c.want);
    });
  }

  it("matches the district case-insensitively and ignores blank parts", () => {
    expect(splitShippingAddressForForm(" House 12 , , Mirpur ,  dhaka ", " Dhaka ")).toEqual({
      village: "House 12",
      thana: "Mirpur",
    });
  });

  it("accepts a null district", () => {
    expect(splitShippingAddressForForm("House 12, Mirpur", null)).toEqual({
      village: "House 12",
      thana: "Mirpur",
    });
  });

  it("re-splits a joined address to the same fields", () => {
    for (const c of CASES) {
      const first = splitShippingAddressForForm(c.address, c.district);
      const joined = joinVillageThanaDistrict(first.village, first.thana, c.district);
      expect(splitShippingAddressForForm(joined, c.district), c.name).toEqual(first);
    }
  });
});
