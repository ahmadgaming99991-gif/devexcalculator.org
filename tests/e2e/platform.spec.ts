import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * `/platform/` after it stopped being rendered per request.
 *
 * The page is now a static document with one client island in it: the tables
 * and charts are fetched from this site's own data Worker after load. That
 * changes what these tests must guard, and the list got longer rather than
 * shorter.
 *
 * Three claims are load-bearing:
 *
 *   1. The document explains itself without any fetch succeeding. A crawler
 *      that runs no JavaScript, and a reader whose request fails, must still
 *      learn what is measured, where it comes from, how often, and what it
 *      cannot be used for.
 *   2. No request leaves for a host this site does not control. Roblox is
 *      called by a scheduled job, never by a reader's browser.
 *   3. Every state is stated. An outage is never a zero, a blank, or a number
 *      presented as current.
 *
 * Data-bearing assertions run against an intercepted API so they test the
 * dashboard rather than whatever Roblox is doing this minute. The unintercepted
 * runs assert the static document and the failure states, which is what a real
 * reader gets when the data plane is unreachable.
 */

/**
 * Matched by predicate, not by glob.
 *
 * A Playwright route pattern without a scheme is resolved against `baseURL`, so
 * `"**​/v1/platform/**"` quietly only ever matched same-origin requests - and the
 * data plane is a different origin. Every intercepted test then measured the
 * unreachable state instead of the dashboard.
 */
const API = (url: URL) => url.pathname.startsWith("/v1/platform/");

const OBSERVED_AT = new Date(Date.now() - 4 * 60_000).toISOString();

function hourlyPoints(count: number, base: number): [number, number][] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => [now - (count - 1 - i) * 3_600_000, base + i * 37]);
}

const RANKINGS = {
  ok: true,
  data: {
    ranking: "top-trending",
    rankings: [
      { id: "top-trending", name: "Top Trending", subtitle: "What is busy", size: 3 },
      { id: "up-and-coming", name: "Up and Coming", subtitle: null, size: 2 },
    ],
    platform: { players: 1_310, experiences: 3, rankings: 2 },
    source: { status: "read", detail: null },
    experiences: [
      {
        i: 111, r: 11, n: "Test Experience One", p: 900, s: false,
        x: {
          v: 12_345, m: 50, c: "Studio One", cv: true, u: 90, d: 10, f: 3_210,
          g: "Adventure", a: "Maturity: Minimal", o: new Date(Date.now() - 5 * 3_600_000).toISOString(),
        },
      },
      { i: 222, r: 22, n: "Test Experience Two", p: 400, s: true, x: null },
      {
        i: 333, r: null, n: "Test Experience Three", p: 10, s: false,
        x: {
          v: 5, m: 10, c: "Studio Three", cv: false, u: 1, d: 1, f: 2,
          g: "Obby", a: "Maturity: Mild", o: new Date(Date.now() - 2 * 3_600_000).toISOString(),
        },
      },
    ],
  },
  meta: {
    observedAt: OBSERVED_AT,
    collector: { outcome: "recorded", lastRunAt: OBSERVED_AT, consecutiveFailures: 0, detail: null },
    collectionIntervalMinutes: 15,
    historyIntervalMinutes: 60,
  },
};

const UP_AND_COMING = {
  ...RANKINGS,
  data: { ...RANKINGS.data, ranking: "up-and-coming", experiences: RANKINGS.data.experiences.slice(0, 2) },
};

const TOTALS = {
  ok: true,
  data: { days: 14, points: hourlyPoints(40, 1_000_000) },
  meta: { observedAt: OBSERVED_AT, collectionIntervalMinutes: 15, retentionDays: 14 },
};

const HIGHLIGHTS = {
  ok: true,
  data: {
    at: hourlyPoints(30, 0).map(([at]) => at),
    series: [
      { id: "111", name: "Test Experience One", players: hourlyPoints(30, 800).map(([, v]) => v) },
      { id: "222", name: "Test Experience Two", players: hourlyPoints(30, 300).map(([, v]) => v) },
      { id: "333", name: "Test Experience Three", players: hourlyPoints(30, 100).map(([, v]) => v) },
    ],
  },
  meta: { intervalMinutes: 60, days: 7 },
};

const EXPERIENCE = {
  ok: true,
  data: { universeId: 111, name: "Test Experience One", days: 7, points: hourlyPoints(20, 800) },
  meta: { intervalMinutes: 60, days: 7 },
};

/** Serves the data plane from fixtures, so the dashboard is what is under test. */
async function serveApi(page: Page, options: { fail?: boolean; empty?: boolean } = {}) {
  await page.route(API, async (route: Route) => {
    if (options.fail) return route.fulfill({ status: 500, body: "{}" });
    if (options.empty) {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "no-observations", message: "Nothing yet." }),
      });
    }

    const url = new URL(route.request().url());
    const body = url.pathname.endsWith("/totals")
      ? TOTALS
      : url.pathname.endsWith("/highlights")
        ? HIGHLIGHTS
        : url.pathname.includes("/experience/")
          ? EXPERIENCE
          : url.searchParams.get("ranking") === "up-and-coming"
            ? UP_AND_COMING
            : RANKINGS;

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });
}

/** Any request to a host this site does not control. */
function isThirdParty(url: string): boolean {
  const host = new URL(url).hostname;
  if (host === "localhost" || host.endsWith("127.0.0.1")) return false;
  return !host.endsWith("devexcalculator.org");
}

test.describe("the static document", () => {
  test("explains itself with no data and no JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/platform/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Roblox platform");

    const main = (await page.locator("main").innerText()).toLowerCase();
    // What is measured, where it comes from, how often, how fresh, and what it
    // cannot tell you — none of which depends on today's numbers.
    expect(main).toContain("how this page gets its numbers");
    expect(main).toContain("how fresh these figures are");
    expect(main).toContain("what these figures cannot tell you");
    expect(main).toContain("roblox");
    expect(main).toMatch(/every 15 minutes/);
    expect(main).toMatch(/not a platform-wide player count/);
    expect(main).toMatch(/nothing is back-filled|nothing is averaged/);
    // And it says the tables need JavaScript rather than leaving a hole.
    expect(main).toMatch(/need javascript/);

    await context.close();
  });

  test("keeps the section headings in the HTML before any fetch resolves", async ({ page }) => {
    // The island's first render is what is baked into the static file, so the
    // headings must not wait on data. Asserted with the API held open.
    await page.route(API, () => {
      /* never fulfilled: the request hangs for the life of the test */
    });
    await page.goto("/platform/");

    for (const id of ["live", "experiences-over-time", "largest", "history", "how", "limits", "data", "faqs"]) {
      await expect(page.locator(`#${id}`), id).toBeVisible();
    }
    await expect(page.locator("#live")).toContainText(/loading the latest observation/i);
  });

  test("keeps one canonical for every query variant", async ({ page }) => {
    for (const url of [
      "/platform/",
      "/platform/?ranking=top-playing-now",
      "/platform/?days=1",
      "/platform/?ranking=top-playing-now&days=7&experience=111",
    ]) {
      await page.goto(url);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/platform\/$/);
    }
  });

  test("serves the same document for every query variant", async ({ request }) => {
    /*
     * One prerendered file, not a render per combination.
     *
     * Asserted against the bytes the server returns rather than the DOM the
     * browser ends up with. An earlier version measured `main.innerHTML.length`
     * after `goto`, which samples whatever hydration had reached by then and
     * failed under a loaded suite for a reason that had nothing to do with the
     * claim. The response body cannot hydrate, so this is both deterministic
     * and the stronger statement: not "close enough", but the same file.
     */
    const bodyOf = async (url: string) => {
      const response = await request.get(url);
      expect(response.status(), url).toBe(200);
      return response.text();
    };

    const plain = await bodyOf("/platform/");
    for (const url of [
      "/platform/?days=1",
      "/platform/?ranking=anything",
      "/platform/?experience=999",
      "/platform/?ranking=top-playing-now&days=7&experience=111",
    ]) {
      expect(await bodyOf(url), url).toBe(plain);
    }
  });

  test("responds 200 to a ranking that does not exist", async ({ page }) => {
    const response = await page.goto("/platform/?ranking=not-a-real-ranking");
    expect(response?.status()).toBe(200);
  });
});

test.describe("privacy of the reader path", () => {
  test("makes no request to Roblox and none to any third party", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      if (isThirdParty(request.url())) external.push(request.url());
    });

    await page.goto("/platform/", { waitUntil: "load" });
    await page.waitForTimeout(1_500);

    expect(external.filter((url) => url.includes("roblox"))).toEqual([]);
    expect(external).toEqual([]);
  });
});

test.describe("the dashboard with data", () => {
  test.beforeEach(async ({ page }) => {
    await serveApi(page);
  });

  test("states the platform figure with the method beside it", async ({ page }) => {
    await page.goto("/platform/");
    const live = page.locator("#live");
    await expect(live).toContainText("1,310");

    const text = await live.innerText();
    expect(text).toContain("Players across every experience Roblox is ranking");
    expect(text).toMatch(/Summed from [\d,]+ experiences across Roblox[’']s \d+ public rankings/);
    expect(text).toContain("counted once each");
    expect(text).toContain("This is a floor, not a platform total");
  });

  test("draws the ranking as a table, attributing every row", async ({ page }) => {
    await page.goto("/platform/");
    const rows = page.locator("#live tbody tr");
    await expect(rows).toHaveCount(3);

    // Names link out to Roblox: this page borrows Roblox's ranking and says so.
    await expect(page.locator('#live tbody a[href^="https://www.roblox.com/"]')).toHaveCount(2);
    // A paid placement is labelled, or the table reads as a ranking when part
    // of it was bought.
    await expect(page.locator("#live tbody tr", { hasText: "Test Experience Two" })).toContainText("Sponsored");
  });

  test("shows each row's own refresh time, not the ranking's", async ({ page }) => {
    await page.goto("/platform/");
    const first = page.locator("#live tbody tr").first();
    await expect(first).toContainText(/details refreshed/i);
    // A row nobody has enriched yet says so rather than showing blanks.
    await expect(page.locator("#live tbody tr", { hasText: "Test Experience Two" })).toContainText(
      /details not yet refreshed/i,
    );
    // And the page explains why the two differ.
    await expect(page.locator("#live")).toContainText(/refreshed on a slower rotation/i);
  });

  test("switches ranking and records it in the URL", async ({ page }) => {
    await page.goto("/platform/");
    await expect(page.locator("#live tbody tr")).toHaveCount(3);

    await page.getByRole("button", { name: "Up and Coming" }).click();
    await expect(page).toHaveURL(/ranking=up-and-coming/);
    await expect(page.locator("#live tbody tr")).toHaveCount(2);
  });

  test("keeps both selections when either one changes", async ({ page }) => {
    await page.goto("/platform/?days=1");
    await page.getByRole("button", { name: "Up and Coming" }).click();
    await expect(page).toHaveURL(/days=1/);
    await expect(page).toHaveURL(/ranking=up-and-coming/);

    await page.getByRole("button", { name: "7 days", exact: true }).click();
    await expect(page).toHaveURL(/ranking=up-and-coming/);
    await expect(page).toHaveURL(/days=7/);
  });

  test("restores state from the URL and from Back", async ({ page }) => {
    await page.goto("/platform/?ranking=up-and-coming");
    await expect(page.locator("#live tbody tr")).toHaveCount(2);

    await page.getByRole("button", { name: "Top Trending" }).click();
    await expect(page.locator("#live tbody tr")).toHaveCount(3);

    await page.goBack();
    await expect(page).toHaveURL(/ranking=up-and-coming/);
    await expect(page.locator("#live tbody tr")).toHaveCount(2);
  });

  test("leaves the default view at the canonical URL", async ({ page }) => {
    await page.goto("/platform/?days=1");
    await page.getByRole("button", { name: "14 days", exact: true }).click();
    // The default is omitted rather than written out, so the plain URL stays
    // the one a reader shares.
    await expect(page).toHaveURL(/\/platform\/$/);
  });

  test("charts one experience on request, and only one", async ({ page }) => {
    await page.goto("/platform/?experience=111");
    const detail = page.locator("#experience");
    await expect(detail).toBeVisible();
    await expect(detail.locator("svg")).toHaveCount(1);
    await expect(detail).toContainText("Test Experience One");
  });

  test("charts every tracked experience on one set of axes, with a legend", async ({ page }) => {
    await page.goto("/platform/");
    const section = page.locator("#experiences-over-time");
    await expect(section.locator("svg")).toHaveCount(1);

    // Identity is never carried by colour alone.
    const legend = section.locator("figure ul li");
    expect(await legend.count()).toBeGreaterThan(1);
    expect((await legend.first().innerText()).trim().length).toBeGreaterThan(0);
  });

  test("tracks the busiest single experience without claiming a record", async ({ page }) => {
    await page.goto("/platform/");
    const section = page.locator("#largest");
    await expect(section).toContainText("Highest observed");
    await expect(section).toContainText("It is not an all-time record");
  });

  test("charts the observed totals and says what it retains", async ({ page }) => {
    await page.goto("/platform/");
    const history = page.locator("#history");
    await expect(history).toContainText(/observations recorded/i);
    await expect(history.locator("svg")).toHaveCount(1);
    await expect(history).toContainText(/recorded by this site/i);
  });

  /**
   * The table is the widest thing on the page, and it must scroll inside its
   * own box rather than taking the document with it.
   *
   * Measured against `main` rather than the document: the shared header
   * overflows a 320px viewport on every route of this site, which is a
   * pre-existing failure that `accessibility.spec.ts` already owns. Asserting
   * the whole document here would re-report that one global bug as a platform
   * bug and hide a real regression in this table behind it.
   */
  test("does not scroll sideways at 320px with a full ranking", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    for (const url of ["/platform/", "/platform/?ranking=up-and-coming"]) {
      await page.goto(url, { waitUntil: "load" });
      await page.locator("#live tbody tr").first().waitFor();
      const overflow = await page.locator("main").evaluate((node) => node.scrollWidth - node.clientWidth);
      expect(overflow, `${url} scrolls sideways inside <main> by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("the dashboard without data", () => {
  test("says the request failed, offers a retry, and shows no figures", async ({ page }) => {
    await serveApi(page, { fail: true });
    await page.goto("/platform/");

    const live = page.locator("#live");
    await expect(live).toContainText(/could not be loaded/i);
    await expect(live.getByRole("button", { name: /try again/i })).toBeVisible();

    // No zero, no blank, no stale number presented as current.
    await expect(live.locator("tbody tr")).toHaveCount(0);
    expect(await live.innerText()).not.toMatch(/\b0\b\s*$/);

    // And the static explanation is untouched by the failure.
    await expect(page.locator("#limits")).toBeVisible();
    await expect(page.locator("#how")).toContainText(/how fresh these figures are/i);
  });

  test("distinguishes nothing-collected-yet from unreachable", async ({ page }) => {
    await serveApi(page, { empty: true });
    await page.goto("/platform/");

    const live = page.locator("#live");
    await expect(live).toContainText(/no observations recorded yet/i);
    // A site that is simply new must not be reported as broken.
    await expect(live).not.toContainText(/could not be loaded/i);
  });

  test("announces the loading and error states to assistive technology", async ({ page }) => {
    await page.route(API, () => {});
    await page.goto("/platform/");
    // The waiting state is announced rather than only drawn.
    await expect(page.locator("#live [aria-live]")).toContainText(/loading the latest observation/i);
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
    expect(await page.content()).not.toContain("tradingview");
    expect(await page.locator("iframe").count()).toBe(0);
  });

  test("never shows a price without a provider and a time behind it", async ({ page }) => {
    await page.goto("/platform/stock/");

    /*
     * The price arrives after load now, from `/api/stock/`.
     *
     * The page reading it during its own server render is what made this
     * document a request-time render, at 884 ms of CPU on a cold request for a
     * page that is otherwise a fixed explanation of where the figure comes
     * from. Waiting for the island to settle is the only change here: every
     * assertion below is the one that was already being made, and the loading
     * state is not allowed to stand in for any of them.
     */
    const block = page.locator("#quote");
    await expect(block).not.toContainText("Loading the price", { timeout: 15_000 });

    const quote = (await block.innerText()).toLowerCase();

    if (quote.includes("no live price is configured")) {
      expect(quote).toMatch(/stock_provider|stock_api_key/);
      expect(quote).not.toMatch(/\$\s?\d/);
      return;
    }

    if (quote.includes("did not answer")) {
      expect(quote).not.toMatch(/\$\s?\d/);
      return;
    }

    expect(quote).toMatch(/\$\s?\d/);
    expect(quote).toContain("as of");
    expect(quote).toMatch(/via \w+/);
    expect(quote).toContain("fetched server-side");

    if (quote.includes("not the latest")) {
      expect(quote).toMatch(/most recent quote this site received/);
      expect(quote).toMatch(/nothing has been adjusted to look current/);
    }
  });

  test("carries the reported results and an advice disclaimer", async ({ page }) => {
    await page.goto("/platform/stock/");
    const text = (await page.locator("main").innerText()).toLowerCase();

    expect(text).toContain("not investment advice");
    expect(text).toContain("developer exchange fees");
  });
});
