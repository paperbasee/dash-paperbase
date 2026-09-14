import { describe, expect, it } from "vitest";
import { ApiHttpError } from "@/lib/api-client";
import { normalizeError } from "@/notifications/normalizeError";

const FALLBACK = "The server rejected the updated order payload.";

function http400(body: unknown, message = "HTTP 400") {
  return normalizeError(new ApiHttpError(message, 400, body), FALLBACK);
}

describe("normalizeError for API responses", () => {
  it("shows the first field error of a field-keyed list", () => {
    const n = http400({ items: ["Selected product is unavailable."] });
    expect(n.message).toBe("Selected product is unavailable.");
    expect(n.fieldErrors).toEqual({ items: "Selected product is unavailable." });
  });

  it("shows a field-keyed plain string", () => {
    const n = http400({ status: "Remove unavailable products before updating order status" });
    expect(n.message).toBe("Remove unavailable products before updating order status");
  });

  it("shows a nested field error", () => {
    const n = http400({ shipping_zone_public_id: ["This field may not be null."] });
    expect(n.message).toBe("This field may not be null.");
  });

  it("prefers detail over field errors", () => {
    expect(http400({ detail: "Plain", items: ["Other"] }, "Plain").message).toBe("Plain");
    expect(http400({ detail: "Plain" }, "Plain").message).toBe("Plain");
  });

  it("never shows an HTML error page", () => {
    const html = "<!doctype html><html><body><h1>Server Error (500)</h1></body></html>";
    expect(normalizeError(new ApiHttpError("HTTP 500", 500, html), FALLBACK).message).toBe(FALLBACK);
    expect(normalizeError(new ApiHttpError(html, 500, html), FALLBACK).message).toBe(FALLBACK);
  });

  it("never shows a bare HTTP status", () => {
    expect(normalizeError(new ApiHttpError("HTTP 500", 500, null), FALLBACK).message).toBe(FALLBACK);
    expect(normalizeError(new ApiHttpError("HTTP 500", 500, null)).message).not.toMatch(/HTTP/);
  });

  it("uses field errors of a plain object error too", () => {
    expect(normalizeError({ email: ["Enter a valid email address."] }, FALLBACK).message).toBe(
      "Enter a valid email address.",
    );
  });
});
