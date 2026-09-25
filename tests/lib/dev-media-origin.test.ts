/**
 * The dashboard's CSP allows the local media store in development and adds
 * nothing in production, whatever the media setting says.
 */
import { describe, expect, test } from "vitest";

import { LOCAL_MEDIA_ORIGIN, devMediaOrigin } from "@/lib/dev-media-origin";

describe("devMediaOrigin", () => {
  test("production adds nothing, even with a media URL set", () => {
    expect(devMediaOrigin(false, "https://media.example.com/bucket")).toBe("");
    expect(devMediaOrigin(false, "http://localhost:9000/storage-paperbase")).toBe("");
    expect(devMediaOrigin(false, undefined)).toBe("");
  });

  test("development takes the origin of the media URL, without its path", () => {
    expect(devMediaOrigin(true, "http://localhost:9000/storage-paperbase")).toBe("http://localhost:9000");
    expect(devMediaOrigin(true, " http://127.0.0.1:9100/x/ ")).toBe("http://127.0.0.1:9100");
  });

  test("development without a usable media URL falls back to local MinIO", () => {
    expect(LOCAL_MEDIA_ORIGIN).toBe("http://localhost:9000");
    expect(devMediaOrigin(true, undefined)).toBe(LOCAL_MEDIA_ORIGIN);
    expect(devMediaOrigin(true, "")).toBe(LOCAL_MEDIA_ORIGIN);
    expect(devMediaOrigin(true, "not a url")).toBe(LOCAL_MEDIA_ORIGIN);
  });
});
