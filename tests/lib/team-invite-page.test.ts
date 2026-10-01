import { describe, expect, it } from "vitest";

import { inviteDay, inviteScreen, parseInvitePreview, type InvitePreview } from "@/lib/team/invite-page";

const answer = (over: Record<string, unknown> = {}) => ({
  status: "pending",
  store: { name: "GADZILLA", logo_url: null },
  role: { name: "Manager", description: "Runs day-to-day operations." },
  inviter: { name: "Mushfikur Rahman", avatar_seed: "usr_1" },
  email_masked: "k•••@g•••.com",
  expires_at: "2026-10-08T18:04:11Z",
  viewer: null,
  ...over,
});

const read = (over: Record<string, unknown> = {}): InvitePreview => parseInvitePreview(answer(over))!;

describe("the invite page", () => {
  it("reads the API's answer, and nothing that is not as expected", () => {
    expect(read().store).toEqual({ name: "GADZILLA", logo_url: null });
    expect(read({ inviter: null }).inviter).toBeNull();
    expect(parseInvitePreview(null)).toBeNull();
    expect(parseInvitePreview(answer({ status: "made_up" }))).toBeNull();
    expect(parseInvitePreview(answer({ store: { name: "" } }))).toBeNull();
    expect(parseInvitePreview(answer({ viewer: { email: "a@b.c", refusal: "nope" } }))).toBeNull();
  });

  it("asks a person who is not signed in to join", () => {
    expect(inviteScreen(read())).toBe("join");
  });

  it("lets the invited account join, and tells any other account why it can't", () => {
    const viewer = (refusal: string) => ({ viewer: { email: "k@g.com", refusal } });
    expect(inviteScreen(read(viewer("")))).toBe("accept");
    expect(inviteScreen(read(viewer("email_mismatch")))).toBe("someone_else");
    expect(inviteScreen(read(viewer("owns_store")))).toBe("owns_store");
    expect(inviteScreen(read(viewer("unverified")))).toBe("unverified");
    expect(inviteScreen(read(viewer("already_member")))).toBe("already_member");
  });

  it("says how an invite that is over ended", () => {
    expect(inviteScreen(read({ status: "expired" }))).toBe("ended");
    expect(inviteScreen(read({ status: "revoked" }))).toBe("cancelled");
    expect(inviteScreen(read({ status: "accepted" }))).toBe("used");
  });

  it("tells someone already on the team so, whatever became of the invite", () => {
    const member = { viewer: { email: "k@g.com", refusal: "already_member" } };
    expect(inviteScreen(read({ status: "accepted", ...member }))).toBe("already_member");
    expect(inviteScreen(read({ status: "expired", ...member }))).toBe("already_member");
  });

  it("names the day in Bangladesh, in the page's language", () => {
    // 18:04 UTC on the 8th is past midnight in Dhaka: the 9th.
    expect(inviteDay("2026-10-08T18:04:11Z", "en")).toBe("9 October");
    expect(inviteDay("2026-10-08T18:04:11Z", "bn")).toBe("৯ অক্টোবর");
    expect(inviteDay("not a date", "en")).toBe("");
  });
});
