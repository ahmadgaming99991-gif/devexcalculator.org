import { describe, expect, it } from "vitest";
import { upgradeIsDisabled, upgradeToHttps } from "@/lib/http/https-upgrade";

describe("upgradeToHttps", () => {
  it("redirects a plain HTTP request to the same URL over HTTPS", () => {
    const response = upgradeToHttps({ url: "http://devexcalculator.org/devex-rates/" });
    expect(response?.status).toBe(301);
    expect(response?.headers.get("location")).toBe("https://devexcalculator.org/devex-rates/");
  });

  it("keeps the path, the query and the trailing slash exactly", () => {
    const response = upgradeToHttps({ url: "http://devexcalculator.org/platform/?ranking=top" });
    expect(response?.headers.get("location")).toBe(
      "https://devexcalculator.org/platform/?ranking=top",
    );
  });

  it("carries HSTS on the redirect itself", () => {
    // This redirect is the first response a first-time visitor over HTTP sees,
    // and the only chance to arm HSTS before they follow it.
    const response = upgradeToHttps({ url: "http://devexcalculator.org/" });
    expect(response?.headers.get("strict-transport-security")).toContain("max-age=31536000");
  });

  it("leaves an HTTPS request alone", () => {
    expect(upgradeToHttps({ url: "https://devexcalculator.org/" })).toBeNull();
  });
});

describe("the local escape hatch", () => {
  const request = { url: "http://devexcalculator.org/" };

  it("is off unless a variable says exactly 1", () => {
    // `wrangler dev` presents the production hostname over plain HTTP and then
    // rewrites Location back to 127.0.0.1, so the Worker redirected every
    // request to itself and no end-to-end test could reach a page. Turning the
    // upgrade off has to be a deliberate act, not a guess about the request.
    expect(upgradeIsDisabled(undefined)).toBe(false);
    expect(upgradeIsDisabled({})).toBe(false);
    expect(upgradeIsDisabled({ DISABLE_HTTPS_UPGRADE: "1" })).toBe(true);
  });

  it("ignores every other value, including the ones that look truthy", () => {
    for (const value of ["0", "true", "yes", "", "01", " 1"]) {
      expect(upgradeIsDisabled({ DISABLE_HTTPS_UPGRADE: value }), value).toBe(false);
      expect(upgradeToHttps(request, { DISABLE_HTTPS_UPGRADE: value })?.status, value).toBe(301);
    }
  });

  it("suppresses the redirect when it is set", () => {
    expect(upgradeToHttps(request, { DISABLE_HTTPS_UPGRADE: "1" })).toBeNull();
  });

  it("is absent from wrangler.jsonc, so a deploy cannot have it", async () => {
    // The guarantee that matters: production behaviour is unchanged because
    // the variable does not exist there.
    const { readFileSync } = await import("node:fs");
    const config = readFileSync("wrangler.jsonc", "utf8");
    expect(config).not.toContain("DISABLE_HTTPS_UPGRADE");
  });
});
