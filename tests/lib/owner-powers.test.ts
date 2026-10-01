import { describe, expect, it } from "vitest";

import { OWNER_POWERS, holdsOwnerPower } from "@/config/owner-powers";

const owner = { isOwner: true, isSuperuser: false };
const member = { isOwner: false, isSuperuser: false };
const superuser = { isOwner: false, isSuperuser: true };

describe("the owner's powers", () => {
  it("are the owner's and no member's, Admin or not", () => {
    for (const power of OWNER_POWERS) {
      expect(holdsOwnerPower(power, owner), power).toBe(true);
      expect(holdsOwnerPower(power, member), power).toBe(false);
    }
  });

  it("show to Paperbase support to read, but never the sessions", () => {
    const support = { ...owner, inSupportMode: true };
    expect(holdsOwnerPower("payments", support)).toBe(true);
    expect(holdsOwnerPower("sessions", support)).toBe(false);
  });

  it("show to a platform superuser, but never the sessions", () => {
    expect(holdsOwnerPower("domains", superuser)).toBe(true);
    expect(holdsOwnerPower("sessions", superuser)).toBe(false);
  });

  it("hide nothing while it isn't known who this is", () => {
    expect(holdsOwnerPower("team", { ...member, isUnknown: true })).toBe(true);
  });
});
