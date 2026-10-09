/**
 * The passkey permission file (guidelines/accounts-plan.md, section 9): it lets Accounts, at
 * accounts.paperbase.me, use the passkeys made on this site. Live before Accounts is (step 5's
 * rehearsal, 2026-10-09): browsers fetch it at /.well-known/webauthn, read it as JSON, and give
 * up on a redirect -- so it is served as JSON and the sign-in redirect never touches it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

describe("the passkey permission file", () => {
  it("names production's Accounts, and no one else", () => {
    expect(JSON.parse(read("public/.well-known/webauthn"))).toEqual({
      origins: ["https://accounts.paperbase.me"],
    });
  });

  it("is served as JSON, which a file without an extension is not by itself", () => {
    const config = read("next.config.ts");
    expect(config).toContain('source: "/.well-known/webauthn",');
    expect(config).toContain('headers: [{ key: "Content-Type", value: "application/json" }],');
  });

  it("is never sent to sign in: the proxy leaves every address with a dot alone", () => {
    const proxy = read("src/proxy.ts");
    expect(proxy).toContain('pathname.includes(".")');
    expect(proxy).toContain(".*\\\\..*");
  });
});
