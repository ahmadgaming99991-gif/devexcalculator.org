import { expect, test } from "@playwright/test";

/**
 * The platform pages make two promises the rest of the suite does not cover:
 * that live figures reach the reader as server-rendered HTML with no
 * third-party request from their browser, and that every state the data can be
 * in is stated rather than left blank.
 */

/**
 * Requests to hosts these pages are responsible for.
 *
 * Cloudflare injects its Web Analytics beacon into responses at the edge, after
 * the Worker has replied, so it appears against every page regardless of what
 * that page contains. Whether it should be there at all is a separate question
 * with its own test in content.spec.ts; counting it here would only make these
 * assertions fail for something they do not control.
 */
const EDGE_INJECTED = ["static.cloudflareinsights.com"];

function isThirdParty(url: string): boolean {
  const host = new URL(url).hostname;
  if (host === "localhost" || host.endsWith("127.0.0.1")) return false;
  if (host.endsWith("devexcalculator.org")) return false;
  return !EDGE_INJECTED.some((injected) => host.endsWith(injected));
}

test.describe("live platform activity", () => {
  test("renders figures server-side with no request to Roblox from the browser", async ({
    page,
  }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      if (isThirdParty(request.url())) external.push(request.url());
    });

    await page.goto("/platform/", { waitUntil: "load" });
    await page.waitForTimeout(1_000);

    // The distinguishing claim: Roblox is called by the server, never by the
    // reader, so no roblox.com or apis.roblox.com request may appear here.
    expect(external.filter((url) => url.includes("roblox"))).toEqual([]);
    expect(external).toEqual([]);
  });

  test("says which state it is in rather than showing an empty section", async ({ page }) => {
    await page.goto("/platform/");

    const live = page.locator("#live");
    await expect(live).toBeVisible();

    // Each section streams in behind a Suspense boundary, so the fallback is
    // legitimately present first. Waiting for it to go both confirms the
    // loading state exists and that it resolves into something.
    await expect(live).not.toContainText("Loading live figures", { timeout: 20_000 });

    // Either it has figures, or it says why it does not. Both are acceptable;
    // silence is not, and an outage must not be indistinguishable from zero.
    const liveText = (await live.innerText()).toLowerCase();
    expect(
      /players in these experiences|unavailable right now|returned no experiences/.test(liveText),
      `The live section said none of the expected things:\n${liveText.slice(0, 300)}`,
    ).toBe(true);

    const history = page.locator("#history");
    await expect(history).not.toContainText("Loading recorded observations", {
      timeout: 20_000,
    });
    const historyText = (await history.innerText()).toLowerCase();
    expect(
      /observations recorded|no observations recorded yet|not available in this environment|could not be read|observation/.test(
        historyText,
      ),
      `The history section said none of the expected things:\n${historyText.slice(0, 300)}`,
    ).toBe(true);
  });

  test("never labels the window as longer than what has been collected", async ({ page }) => {
    await page.goto("/platform/");
    const section = page.locator("#history");
    await expect(section).not.toContainText("Loading recorded observations", {
      timeout: 20_000,
    });
    const history = (await section.innerText()).toLowerCase();

    // The failure this guards against is a chart captioned "14 days" on day
    // one. A 14-day claim is only allowed once the page also reports having
    // recorded that many days.
    if (history.includes("14 days")) {
      expect(history).toMatch(/period covered[\s\S]{0,40}14 days/);
    }
  });

  test("works without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/platform/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Roblox platform");
    expect((await page.locator("main").innerText()).length).toBeGreaterThan(800);
    await context.close();
  });
});

test.describe("stock page", () => {
  test("embeds no third-party market widget", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      if (isThirdParty(request.url())) external.push(request.url());
    });

    await page.goto("/platform/stock/", { waitUntil: "load" });
    await page.waitForTimeout(1_000);

    expect(external).toEqual([]);
    // The specific thing the competitor does, named so the intent survives.
    expect(await page.content()).not.toContain("tradingview");
    expect(await page.locator("iframe").count()).toBe(0);
  });

  test("states that no price is configured instead of showing a placeholder", async ({ page }) => {
    await page.goto("/platform/stock/");
    const quote = (await page.locator("#quote").innerText()).toLowerCase();

    // Either a real attributed quote, or a plain statement that there is none.
    // What must never appear is a number with no provider behind it.
    if (!quote.includes("no live price is configured")) {
      expect(quote).toMatch(/fetched server-side|did not answer/);
    } else {
      expect(quote).toContain("stock_provider");
      expect(quote).not.toMatch(/\$\s?\d/);
    }
  });

  test("carries the reported results and an advice disclaimer", async ({ page }) => {
    await page.goto("/platform/stock/");
    const text = (await page.locator("main").innerText()).toLowerCase();

    expect(text).toContain("not investment advice");
    expect(text).toContain("developer exchange fees");
  });
});
