import { describe, expect, it } from "vitest";

import { signInOf } from "@/lib/auth";

const token = (payload: object) => `h.${btoa(JSON.stringify(payload)).replace(/=+$/, "")}.s`;

describe("signInOf", () => {
  it("reads who a token signs in, and which sign-in", () => {
    expect(signInOf(token({ user_public_id: "usr_1", sid: "ses_1" }))).toEqual({ user: "usr_1", sid: "ses_1" });
  });

  it("gives no sign-in for a token from before sessions", () => {
    expect(signInOf(token({ user_public_id: "usr_1" }))).toEqual({ user: "usr_1", sid: "" });
  });

  it("is nothing for no token or one it cannot read", () => {
    expect(signInOf(null)).toBeNull();
    expect(signInOf("not-a-token")).toBeNull();
  });
});
