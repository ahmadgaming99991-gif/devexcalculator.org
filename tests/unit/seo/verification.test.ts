import { describe, expect, it } from "vitest";
import { isUsableToken } from "../../../src/lib/seo/verification";

/**
 * A verification tag carrying a placeholder is worse than no tag: it looks
 * configured, it proves nothing, and nobody re-reads a `<head>`. These pin the
 * cases that must never reach the HTML.
 */

describe("site verification tokens", () => {
  it("accepts a token shaped like the ones these services issue", () => {
    // Google issues 43 characters; Bing issues 32 hex.
    expect(isUsableToken("aBcD1234-_efGH5678ijKLmnOPqrST90uvWXyz12345")).toBe(true);
    expect(isUsableToken("A1B2C3D4E5F60718293A4B5C6D7E8F90")).toBe(true);
  });

  it("rejects nothing at all", () => {
    expect(isUsableToken(null)).toBe(false);
    expect(isUsableToken(undefined)).toBe(false);
    expect(isUsableToken("")).toBe(false);
    expect(isUsableToken("   ")).toBe(false);
  });

  it("rejects the placeholders people actually leave behind", () => {
    for (const value of [
      "YOUR_GOOGLE_VERIFICATION_TOKEN",
      "your-verification-code-here",
      "PLACEHOLDER_TOKEN_VALUE_HERE",
      "changeme-changeme-changeme",
      "xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "example-token-goes-in-here",
      "TODO_add_the_real_token_here",
    ]) {
      expect(isUsableToken(value), `${value} was accepted`).toBe(false);
    }
  });

  it("rejects a token too short to be one", () => {
    expect(isUsableToken("abc123")).toBe(false);
  });

  it("rejects a pasted tag rather than its content", () => {
    // The commonest mistake: copying the whole meta element out of the console.
    expect(isUsableToken('<meta name="google-site-verification" content="abc" />')).toBe(false);
    expect(isUsableToken("token with spaces in it")).toBe(false);
  });

  it("does not reject a real token that merely contains a banned word", () => {
    // "test" inside an opaque run of characters is not a placeholder, and
    // refusing it would silently un-verify a real property.
    expect(isUsableToken("aBcteste1234567890fghijklmnop")).toBe(true);
  });
});
