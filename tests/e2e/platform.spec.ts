import { expect, test } from "@playwright/test";
import { describeOverflow, measureOverflow } from "../support/overflow";

/**
 * The platform pages make two promises the rest of the suite does not cover:
 * that live figures reach the reader as server-rendered HTML with no
 * third-party request from their browser, and that every state the data can be
 * in is stated rather than left blank.
 */

/**
 * Any request to a host this site does not control.
 *
 * There is no allowance for an edge-injected beacon: Cloudflare's Web
 * Analytics auto-install was enabled on this zone and has been turned off, so
 * a third-party request appearing here again means something re-enabled it and
 * the privacy page has stopped being true.
 */
function isThirdParty(url: string): boolean {
  const host = new URL(url).hostname;
  if (host === "localhost" || host.endsWith("127.0.0.1")) return false;
  return !host.endsWith("devexcalculator.org");
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

    // Both sections are rendered inline now rather than streamed, so no
    // loading text should ever appear. Asserting its absence keeps the check
    // meaningful if a Suspense boundary is ever reintroduced — which is what
    // made the live table invisible without JavaScript.
    await expect(live).not.toContainText("Loading live figures");

    // Either it has figures, or it says why it does not. Both are acceptable;
    // silence is not, and an outage must not be indistinguishable from zero.
    const liveText = (await live.innerText()).toLowerCase();
    expect(
      /players in this ranking|unavailable right now|returned no experiences/.test(liveText),
      `The live section said none of the expected things:\n${liveText.slice(0, 300)}`,
    ).toBe(true);

    const history = page.locator("#history");
    await expect(history).not.toContainText("Loading recorded observations");
    const historyText = (await history.innerText()).toLowerCase();
    expect(
      /observations recorded|no observations recorded yet|not available in this environment|could not be read|observation/.test(
        historyText,
      ),
      `The history section said none of the expected things:\n${historyText.slice(0, 300)}`,
    ).toBe(true);
  });

  test("labels the chart with the period actually collected", async ({ page }) => {
    await page.goto("/platform/");
    const section = page.locator("#history");
    await expect(section).not.toContainText("Loading recorded observations");
    const history = (await section.innerText()).toLowerCase();

    // Nothing to check until there is a chart to label.
    if (!history.includes("period covered")) return;

    // The invariant: whatever the chart says it covers must be the same period
    // the page reports having collected. An earlier heuristic looked for the
    // string "14 days" anywhere in the section and flagged the sentence about
    // how long observations are *retained*, which is a different fact.
    // `innerText` puts each stat on its own line, so the value is separated
    // from its label by a newline rather than a space.
    const covered = /period covered\s*([\s\S]+?)\s*most recent/.exec(history);
    expect(covered, `Could not read the stated period from:
${history.slice(0, 200)}`).not.toBeNull();

    const period = (covered?.[1] ?? "").trim();
    expect(period).not.toBe("");
    expect(
      history.includes(`observing for ${period}`),
      `The chart caption does not name the collected period "${period}".`,
    ).toBe(true);
  });

  /**
   * The live table itself must exist without JavaScript, not merely the prose
   * around it.
   *
   * This used to check the heading and the length of `main`, and passed while
   * the entire live section was missing: the sections were streamed behind
   * Suspense, and React delivers streamed content in a hidden holder that an
   * inline script moves into place. With scripting off that script never ran,
   * so `#live table` did not exist at all — and the static commentary was long
   * enough on its own to satisfy the old assertion.
   */
  test("renders the live table without JavaScript, not just the prose", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/platform/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Roblox platform");

    const rows = page.locator("#live tbody tr");
    const count = await rows.count();
    // Either real rows, or a stated reason there are none. Never silence.
    if (count === 0) {
      const live = (await page.locator("#live").innerText()).toLowerCase();
      expect(/unavailable right now|returned no experiences/.test(live)).toBe(true);
    } else {
      expect(count).toBeGreaterThan(1);
      await expect(rows.first()).toBeVisible();
    }

    await context.close();
  });

  test("switches ranking by ordinary navigation, with no JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/platform/");

    const tabs = page.locator('nav[aria-label="Roblox rankings"] a');
    if ((await tabs.count()) === 0) {
      // Roblox returned a single ranking, or none at all; nothing to switch.
      await context.close();
      return;
    }

    expect(await tabs.count()).toBeGreaterThan(1);
    // `aria-current` sits on the link itself, so this is an attribute selector
    // on the same element rather than a descendant lookup.
    await expect(page.locator('nav[aria-label="Roblox rankings"] a[aria-current]')).toHaveCount(1);

    const other = page.locator('nav[aria-label="Roblox rankings"] a:not([aria-current])').first();
    const label = (await other.innerText()).trim();
    await other.click();
    await page.waitForLoadState("load");

    await expect(page.locator('nav[aria-label="Roblox rankings"] [aria-current]')).toHaveText(
      label,
    );
    await context.close();
  });

  test("offers chart ranges that work without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/platform/");

    const ranges = page.locator('nav[aria-label="Chart range"] a');
    if ((await ranges.count()) === 0) {
      // No store bound in this environment, so there is no chart to range over.
      await expect(page.locator("#history")).toContainText(/not available|could not be read/i);
      await context.close();
      return;
    }

    await expect(ranges).toHaveCount(4);
    await expect(page.locator('nav[aria-label="Chart range"] a[aria-current]')).toHaveCount(1);

    await page.locator('nav[aria-label="Chart range"] a', { hasText: "24 hours" }).click();
    await page.waitForLoadState("load");
    expect(page.url()).toContain("days=1");
    await expect(
      page.locator('nav[aria-label="Chart range"] a[aria-current]'),
    ).toHaveText("24 hours");

    await context.close();
  });

  test("a narrower range never shows more than a wider one", async ({ page }) => {
    // The invariant a range selector must not break: narrowing filters stored
    // observations. It cannot invent points, and it cannot stretch a short
    // history over a longer axis.
    const countFor = async (query: string): Promise<number | null> => {
      await page.goto(`/platform/${query}`);
      const text = await page.locator("#history").innerText();
      const match = /observations recorded\s*([\d,]+)/i.exec(text);
      return match ? Number(match[1]!.replace(/,/g, "")) : null;
    };

    const day = await countFor("?days=1");
    const fortnight = await countFor("?days=14");
    if (day === null || fortnight === null) return; // No chart in this environment.

    expect(day).toBeLessThanOrEqual(fortnight);
  });

  test("keeps both selections when either one is changed", async ({ page }) => {
    // The ranking tabs used to build their own URLs and drop `days`, so
    // choosing a 24-hour chart and then another ranking silently reset the
    // range to fourteen days.
    await page.goto("/platform/?days=1");

    const ranking = page.locator('nav[aria-label="Roblox rankings"] a:not([aria-current])').first();
    if ((await page.locator('nav[aria-label="Chart range"] a').count()) === 0) return;
    if ((await ranking.count()) === 0) return;

    const label = (await ranking.innerText()).trim();
    await ranking.click();
    await page.waitForLoadState("load");

    await expect(page.locator('nav[aria-label="Roblox rankings"] a[aria-current]')).toHaveText(
      label,
    );
    await expect(page.locator('nav[aria-label="Chart range"] a[aria-current]')).toHaveText(
      "24 hours",
    );

    // And the other direction: changing the range keeps the ranking.
    await page.locator('nav[aria-label="Chart range"] a', { hasText: "7 days" }).click();
    await page.waitForLoadState("load");
    await expect(page.locator('nav[aria-label="Roblox rankings"] a[aria-current]')).toHaveText(
      label,
    );
  });

  test("states the platform figure with the method beside it", async ({ page }) => {
    await page.goto("/platform/");
    const live = page.locator("#live");
    const text = await live.innerText();

    if (/unavailable right now/i.test(text)) return;

    // The number Roblox does not publish, so it must never be presented as one
    // Roblox published, and never as the whole platform.
    expect(text).toContain("Players across every experience Roblox is ranking");
    expect(text).toMatch(/Summed from [\d,]+ experiences across Roblox[’']s \d+ public rankings/);
    expect(text).toContain("counted once each");
    expect(text).toContain("This is a floor, not a platform total");
  });

  test("shows a full ranking rather than a handful of rows", async ({ page }) => {
    await page.goto("/platform/");
    const rows = page.locator("#live tbody tr");
    if ((await rows.count()) === 0) return;

    // Roblox returns around ninety per sort; the page used to show ten.
    expect(await rows.count()).toBeGreaterThan(40);
  });

  test("charts one experience on request, and only one", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/platform/");

    const trend = page.locator('#live tbody a[href*="experience="]').first();
    if ((await trend.count()) === 0) {
      // No per-experience history in this environment yet.
      await context.close();
      return;
    }

    const href = await trend.getAttribute("href");
    await page.goto(href!);

    const detail = page.locator("#experience");
    await expect(detail).toBeVisible();
    // One chart, not ninety: the expanded view is a selection, not an expansion
    // of every row, because that is work the Worker cannot afford.
    await expect(page.locator("#experience svg")).toHaveCount(1);
    await context.close();
  });

  test("does not scroll sideways at 320px with a full ranking", async ({ page }) => {
    // The widest table on the site, now around ninety rows with a sparkline
    // column. It scrolls inside its own box; the page must not.
    await page.setViewportSize({ width: 320, height: 640 });

    for (const url of ["/platform/", "/platform/?ranking=top-playing-now"]) {
      await page.goto(url, { waitUntil: "load" });
      const report = await measureOverflow(page);
      expect(report.overflow, describeOverflow(url, report)).toBeLessThanOrEqual(0);
    }
  });

  test("keeps one canonical for every ranking", async ({ page }) => {
    // The ranking is a query parameter on one page. Five canonicals would ask
    // to have five near-identical pages indexed.
    for (const url of ["/platform/", "/platform/?ranking=top-playing-now"]) {
      await page.goto(url);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        /\/platform\/$/,
      );
    }
  });

  test("falls back to a real ranking when the query names one that does not exist", async ({
    page,
  }) => {
    const response = await page.goto("/platform/?ranking=not-a-real-ranking");
    expect(response?.status()).toBe(200);

    const live = page.locator("#live");
    await expect(live).toBeVisible();
    const text = (await live.innerText()).toLowerCase();
    expect(/players in this ranking|unavailable right now/.test(text)).toBe(true);
  });

  test("attributes every experience and labels any sponsored placement", async ({ page }) => {
    await page.goto("/platform/");
    const rows = page.locator("#live tbody tr");
    if ((await rows.count()) === 0) return;

    // Names link to Roblox rather than sitting inert, and the link leaves the
    // site explicitly — this page borrows Roblox's ranking and says so.
    const links = page.locator('#live tbody a[href^="https://www.roblox.com/"]');
    expect(await links.count()).toBeGreaterThan(0);

    // Roblox marks paid placements. Wherever one appears it must be labelled,
    // or the table reads as a ranking when part of it was bought.
    const sponsored = page.locator("#live tbody tr", { hasText: /sponsored/i });
    for (let i = 0; i < (await sponsored.count()); i += 1) {
      await expect(sponsored.nth(i).getByText("Sponsored", { exact: true })).toBeVisible();
    }
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
