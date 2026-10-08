/**
 * The preview origin decides whether the editor can be opened at all, and later
 * which frame's messages are trusted, so only a clean https origin (or http on a
 * localhost name, for local testing) counts.
 */

import { describe, expect, test } from "vitest";

import { dashboardFrameSrc, previewOrigin } from "@/lib/theme-editor/preview-origin";

describe("previewOrigin", () => {
  test("unset or blank is null", () => {
    expect(previewOrigin(undefined)).toBeNull();
    expect(previewOrigin(null)).toBeNull();
    expect(previewOrigin("   ")).toBeNull();
  });

  test("an https URL gives its bare origin", () => {
    expect(previewOrigin("https://preview.paperbase.me")).toBe("https://preview.paperbase.me");
    expect(previewOrigin(" https://preview.paperbase.me/ ")).toBe("https://preview.paperbase.me");
    expect(previewOrigin("https://preview.paperbase.me/en?x=1")).toBe("https://preview.paperbase.me");
    expect(previewOrigin("https://preview.example.test:8443")).toBe("https://preview.example.test:8443");
  });

  test("http only on a localhost name", () => {
    expect(previewOrigin("http://preview.pb.localhost:4000")).toBe("http://preview.pb.localhost:4000");
    expect(previewOrigin("http://localhost:4000")).toBe("http://localhost:4000");
    expect(previewOrigin("http://preview.paperbase.me")).toBeNull();
    expect(previewOrigin("http://127.0.0.1:4000")).toBeNull();
  });

  test("anything that is not a web URL is null", () => {
    expect(previewOrigin("preview.paperbase.me")).toBeNull();
    expect(previewOrigin("javascript:alert(1)")).toBeNull();
    expect(previewOrigin("ftp://preview.paperbase.me")).toBeNull();
  });

  test("a wildcard or a trailing dot is not one exact host", () => {
    expect(previewOrigin("https://*.paperbase.me")).toBeNull();
    expect(previewOrigin("https://*")).toBeNull();
    expect(previewOrigin("https://preview.paperbase.me.")).toBeNull();
    expect(previewOrigin("https://[::1]:4000")).toBeNull();
  });
});

describe("dashboardFrameSrc", () => {
  test("adds the preview origin only when one is configured", () => {
    expect(dashboardFrameSrc(null)).toBe("frame-src 'self'");
    expect(dashboardFrameSrc(previewOrigin("https://preview.paperbase.me/"))).toBe(
      "frame-src 'self' https://preview.paperbase.me",
    );
  });

  test("an unusable setting never widens the policy", () => {
    for (const raw of [
      "*",
      "https://*.paperbase.me",
      "https://preview.paperbase.me.",
      "http://preview.paperbase.me",
      "https://preview.paperbase.me; script-src *",
    ]) {
      expect(dashboardFrameSrc(previewOrigin(raw))).toBe("frame-src 'self'");
    }
  });
});
