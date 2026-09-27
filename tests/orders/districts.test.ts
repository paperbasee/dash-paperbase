import { describe, expect, it } from "vitest";
import {
  type DistrictDivision,
  districtLabel,
  districtMatches,
  findDistrict,
} from "@/lib/orders/districts";

/** Two divisions as `GET admin/districts/` sends them. */
const divisions: DistrictDivision[] = [
  {
    key: "dhaka",
    name: "Dhaka",
    name_bn: "ঢাকা",
    districts: [{ key: "dhaka", name: "Dhaka", name_bn: "ঢাকা", aliases: ["dacca"] }],
  },
  {
    key: "chattogram",
    name: "Chattogram",
    name_bn: "চট্টগ্রাম",
    districts: [
      { key: "chattogram", name: "Chattogram", name_bn: "চট্টগ্রাম", aliases: ["chittagong", "ctg"] },
      { key: "coxs-bazar", name: "Cox's Bazar", name_bn: "কক্সবাজার", aliases: ["coxs bazar"] },
    ],
  },
];
const [chattogram, coxsBazar] = divisions[1].districts;

describe("districtMatches", () => {
  it("finds a district by either language or an old spelling", () => {
    for (const query of ["chat", "চট্ট", "Chitta", "CTG", ""]) {
      expect(districtMatches(chattogram, query)).toBe(true);
    }
    expect(districtMatches(coxsBazar, "chitta")).toBe(false);
  });
});

describe("findDistrict", () => {
  it("names the listed district a saved value is, under any spelling", () => {
    expect(findDistrict(divisions, "Chattogram")?.key).toBe("chattogram");
    expect(findDistrict(divisions, " chittagong ")?.key).toBe("chattogram");
    expect(findDistrict(divisions, "ঢাকা")?.key).toBe("dhaka");
  });

  it("leaves an older order's own words alone", () => {
    expect(findDistrict(divisions, "Dhaka city")).toBeNull();
    expect(findDistrict(divisions, "")).toBeNull();
  });
});

describe("districtLabel", () => {
  it("names a place in the dashboard's language", () => {
    expect(districtLabel(chattogram, "bn")).toBe("চট্টগ্রাম");
    expect(districtLabel(chattogram, "en")).toBe("Chattogram");
  });
});
