import { describe, expect, it } from "vitest";

import { isSignInEndReason, pageAfterSignInEnded } from "@/lib/sign-in-ended";

const ended = (reason: unknown) => ({ event: "session.ended", payload: { reason } as Record<string, unknown> });

describe("pageAfterSignInEnded", () => {
  it("sends the tab to sign in, saying why", () => {
    expect(pageAfterSignInEnded(ended("access_changed"), "ses_1", "ses_1")).toBe("/login?ended=access_changed");
    expect(pageAfterSignInEnded(ended("access_ended"), "ses_1", "ses_1")).toBe("/login?ended=access_ended");
  });

  it("leaves even when this browser already forgot the sign-in", () => {
    expect(pageAfterSignInEnded(ended("ended"), "ses_1", null)).toBe("/login?ended=ended");
  });

  it("does not end a different sign-in now in this browser", () => {
    expect(pageAfterSignInEnded(ended("ended"), "ses_1", "ses_2")).toBeNull();
  });

  it("names no reason it does not know", () => {
    expect(pageAfterSignInEnded(ended("<script>"), "ses_1", "ses_1")).toBe("/login");
  });

  it("sends a switched-off or email-changed sign-in to a plain sign-in page", () => {
    // Neither is a reason Accounts' sign-in page explains, and the API does not pass them on.
    expect(pageAfterSignInEnded(ended("switched_off"), "ses_1", "ses_1")).toBe("/login");
    expect(pageAfterSignInEnded(ended("email_changed"), "ses_1", "ses_1")).toBe("/login");
  });

  it("ignores every other event", () => {
    expect(pageAfterSignInEnded({ event: "order.created", payload: {} }, "ses_1", "ses_1")).toBeNull();
  });

  it("knows the reasons the sign-in page explains", () => {
    expect(isSignInEndReason("access_changed")).toBe(true);
    expect(isSignInEndReason("signed_out")).toBe(false);
  });
});
