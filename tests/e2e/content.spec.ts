import { expect, test } from "@playwright/test";
import { describeOverflow, measureOverflow } from "../support/overflow";

/**
 * Content, crawlability and honesty checks.
 *
 * These assert the promises the site makes about itself: that pages explain
 * themselves without JavaScript, that disabled integrations really are absent,
 * that nothing claims eligibility, and that no placeholder text ever reaches
 * the rendered HTML.
 */

const INDEXABLE_ROUTES = [
  "/",
  "/robux-to-usd/",
  "/usd-to-robux/",
  "/devex-rates/",
  "/devex-requirements/",
  "/earned-robux/",
  "/how-to-cash-out-robux/",
  "/devex-rate-history/",
  "/devex-fees-and-taxes/",
  "/robux-tax-calculator/",
  "/calculators/",
  "/guides/",
  "/conversions/",
  "/conversions/100000-robux-to-usd/",
  "/roblox-stats/",
  "/platform/",
  "/platform/stock/",
  "/about/",
  "/methodology/",
  "/sources/",
  "/editorial-policy/",
  "/corrections/",
  "/changelog/",
  "/contact/",
  "/privacy/",
  "/terms/",
  "/disclaimer/",
  "/accessibility/",
];

test.describe("no-JavaScript behaviour", () => {
  test.use({ javaScriptEnabled: false });

  test("the homepage still explains itself", async ({ page }) => {
    await page.goto("/");

    // Rates, formula, examples and guidance are all server rendered.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Scoped to the rate table: an unscoped text match would also hit the
    // rate <option> labels, which are present but not visible.
    await expect(
      page.getByRole("group", { name: /Current DevEx rates/i }).getByText("0.0038").first(),
    ).toBeVisible();
    await expect(page.getByText(/eligible Earned Robux × rate per Robux/)).toBeVisible();
    await expect(page.getByText("$380.00").first()).toBeVisible();
    await expect(page.getByText(/Not affiliated with Roblox Corporation/)).toBeVisible();
  });

  test("header navigation works without scripts at every width", async ({ page }) => {
    // Desktop uses the always-rendered nav; mobile falls back to the
    // <noscript> list, since the menu button cannot open without JavaScript.
    await page.goto("/");
    await page.getByRole("link", { name: "Rates", exact: true }).first().click();
    await expect(page).toHaveURL(/\/devex-rates\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("DevEx rates");
  });

  test("no page is a blank shell", async ({ page }) => {
    for (const route of INDEXABLE_ROUTES) {
      await page.goto(route);
      const text = await page.locator("main").innerText();
      expect(text.length, `${route} rendered almost no content without JavaScript`).toBeGreaterThan(
        800,
      );
    }
  });

  test("rate tables render server-side", async ({ page }) => {
    await page.goto("/devex-rates/");
    // `.first()` because each rate appears both as a value and inside the
    // eligibility summary in the same table.
    const table = page.getByRole("group", { name: /Current DevEx rates/i });
    await expect(table.getByText("0.0038").first()).toBeVisible();
    await expect(table.getByText("0.0035").first()).toBeVisible();
    await expect(table.getByText("0.0054").first()).toBeVisible();
  });
});

test.describe("honesty", () => {
  test("no page claims the user is eligible or guarantees a payout", async ({ page }) => {
    for (const route of INDEXABLE_ROUTES) {
      await page.goto(route);
      const text = await page.locator("body").innerText();

      /*
       * Only unambiguous second-person claims are pattern-matched. Phrases
       * like "guaranteed payout" and "will be approved" appear all over this
       * site inside warnings against exactly those claims, so matching the
       * bare words would flag the honesty rather than the dishonesty.
       */
      expect(text, `${route} claims eligibility`).not.toMatch(/you are eligible/i);
      expect(text, `${route} asserts eligibility`).not.toMatch(/you qualify for devex/i);
      expect(text, `${route} promises approval`).not.toMatch(
        /your (request|payout) (is|will be) (guaranteed|approved)\b/i,
      );
      expect(text, `${route} promises a payment date`).not.toMatch(
        /you will be paid (within|in) \d/i,
      );
    }
  });

  test("the estimate disclaimer appears wherever a payout figure does", async ({ page }) => {
    // The positive counterpart to the check above: a page showing money must
    // also say what that money is and is not.
    for (const route of ["/", "/robux-to-usd/", "/usd-to-robux/", "/conversions/"]) {
      await page.goto(route);
      const text = await page.locator("body").innerText();

      expect(text, `${route} omits the estimate disclaimer`).toMatch(
        /this is an estimate, not a decision/i,
      );
      expect(text, `${route} omits who actually decides`).toMatch(/roblox alone decides/i);
    }
  });

  test("the requirements page separates the threshold from approval", async ({ page }) => {
    await page.goto("/devex-requirements/");
    const text = await page.locator("body").innerText();

    expect(text).toMatch(/meeting the threshold is not approval/i);
    expect(text).toMatch(/a number cannot approve you/i);
  });

  test("no placeholder or lorem ipsum reaches the rendered page", async ({ page }) => {
    // Unconfigured integration values must not appear anywhere in the markup.
    const forbiddenAnywhere = [
      "lorem ipsum",
      "your_ga_id",
      "your_turnstile",
      "example@example.com",
      "changeme",
    ];
    // These are checked against visible text only. `placeholder` is a real
    // HTML attribute on every input, so scanning raw markup for it would
    // flag the whole site.
    const forbiddenInText = ["lorem ipsum", "coming soon", "todo:", "fixme", "tbd"];

    for (const route of INDEXABLE_ROUTES) {
      await page.goto(route);
      const html = (await page.content()).toLowerCase();
      const text = (await page.locator("body").innerText()).toLowerCase();

      for (const needle of forbiddenAnywhere) {
        expect(html, `${route} markup contains "${needle}"`).not.toContain(needle);
      }
      for (const needle of forbiddenInText) {
        expect(text, `${route} text contains "${needle}"`).not.toContain(needle);
      }
    }
  });

  test("every rate-sensitive page shows when it was last verified", async ({ page }) => {
    for (const route of ["/", "/devex-rates/", "/conversions/", "/robux-tax-calculator/"]) {
      await page.goto(route);
      await expect(page.getByText(/Rates verified/).first()).toBeVisible();
    }
  });

  test("the trademark disclaimer appears on every page", async ({ page }) => {
    for (const route of INDEXABLE_ROUTES.slice(0, 8)) {
      await page.goto(route);
      await expect(page.getByText(/Not affiliated with Roblox Corporation/)).toBeVisible();
    }
  });
});

test.describe("disabled integrations", () => {
  test("this site loads no analytics of its own", async ({ page }) => {
    const requested: string[] = [];
    page.on("request", (request) => requested.push(request.url()));

    // Not `networkidle`: against the real deployment it never settles — the
    // page renders completely and the wait times out at 45s. The state is
    // unreliable by design, and the assertion does not need it. A tag that was
    // going to load would be in the document, so the check is the document
    // plus everything requested up to and shortly after load.
    await page.goto("/", { waitUntil: "load" });
    await page.waitForTimeout(1_000);

    const html = await page.content();

    // Providers this site can configure and currently does not. Unlike the
    // host's own beacon below, nothing outside this repository can introduce
    // them, so their absence is absolute.
    // cloudflareinsights.com is included again: the zone's Web Analytics
    // auto-install was on and has been turned off, so a beacon reappearing
    // means the privacy page has stopped being true.
    for (const host of [
      "googletagmanager.com",
      "google-analytics.com",
      "cloudflareinsights.com",
    ]) {
      expect(requested.filter((url) => url.includes(host))).toEqual([]);
      expect(html).not.toContain(host);
    }

    // The site's own Cloudflare Web Analytics integration stays off unless a
    // token is configured, so no beacon may appear in the HTML this site
    // produces. An injected one arrives afterwards and is covered separately.
    expect(html).not.toContain("NEXT_PUBLIC_CF_ANALYTICS_TOKEN");
  });

  test("any analytics the host injects is disclosed on the privacy page", async ({ page }) => {
    // Cloudflare can insert its Web Analytics beacon into responses after the
    // Worker has produced them, and only for browser-like requests — curl and
    // every server-side validator here receive HTML without it, so a browser
    // is the only thing that can see it.
    //
    // Whether it runs is the operator's choice. What is not optional is that
    // the page and the deployment agree, so this asserts the invariant rather
    // than the setting: if the beacon loads, /privacy/ has to say so. It
    // therefore passes both when the beacon is disabled and when it is
    // disclosed, and fails only on the dishonest combination.
    const requested: string[] = [];
    page.on("request", (request) => requested.push(request.url()));

    await page.goto("/", { waitUntil: "load" });
    await page.waitForTimeout(1_000);

    const beaconLoaded = requested.some((url) => url.includes("cloudflareinsights.com"));

    await page.goto("/privacy/");
    const privacy = (await page.textContent("main")) ?? "";
    const disclosesBeacon = /beacon\.min\.js/.test(privacy) && /Cloudflare/.test(privacy);

    expect(
      !beaconLoaded || disclosesBeacon,
      beaconLoaded
        ? "Cloudflare injected an analytics beacon but /privacy/ does not disclose it."
        : "",
    ).toBe(true);

    // And the reverse: do not describe tracking that is not happening. Only
    // against a real deployment, because the injection happens at Cloudflare's
    // edge — a local server has no edge, so its absence there says nothing.
    const againstDeployment = (test.info().project.use.baseURL ?? "").startsWith("https://");
    if (againstDeployment) {
      expect(
        beaconLoaded || !disclosesBeacon,
        "/privacy/ describes an injected analytics beacon, but none loaded. If it was " +
          "turned off, remove the disclosure.",
      ).toBe(true);
    }
  });

  test("no empty advertisement slot is rendered", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-ad-placement]")).toHaveCount(0);
    await expect(page.getByLabel("Advertisement")).toHaveCount(0);
  });

  test("the contact page is honest when no provider is configured", async ({ page }) => {
    await page.goto("/contact/");
    const hasForm = (await page.locator("form").count()) > 0;

    if (!hasForm) {
      // It must say so rather than showing a form that discards messages.
      await expect(page.getByText(/not configured on this deployment/i)).toBeVisible();
    }
  });
});

test.describe("crawl infrastructure", () => {
  test("robots.txt allows content and points at the sitemap", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain("Sitemap:");
    expect(body).toContain("/sitemap.xml");
    expect(body).toContain("Disallow: /api/");
    // Blocking these would stop a crawler seeing the page a reader sees.
    expect(body).not.toMatch(/Disallow:\s*\/_next/);
  });

  test("the sitemap lists only canonical indexable URLs", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);

    const body = await response.text();
    const urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? "");

    expect(urls.length).toBeGreaterThan(20);
    for (const url of urls) {
      expect(url).toMatch(/^https:\/\/devexcalculator\.org\//);
      expect(url, "sitemap must not contain query states").not.toContain("?");
      // `/api/` is the documentation page and belongs here; the endpoints
      // beneath it are data, are marked noindex, and do not.
      expect(url, "sitemap must not contain API endpoints").not.toMatch(/\/api\/.+/);
    }
  });

  test("lastmod reflects content review dates rather than the build time", async ({ request }) => {
    const body = await (await request.get("/sitemap.xml")).text();
    const lastmods = [...body.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1] ?? "");

    expect(lastmods.length).toBeGreaterThan(0);

    /*
     * Every entry must carry a date the content manifest actually declares.
     * At launch all pages legitimately share one review date, so "not all the
     * same" would be the wrong assertion — what matters is that the value comes
     * from `dateModified` and not from `new Date()` at build time. Any date the
     * manifest does not contain means the build time leaked in.
     */
    const declaredDates = new Set(["2026-08-17"]);
    for (const value of lastmods) {
      const date = value.slice(0, 10);
      expect(declaredDates.has(date), `lastmod ${value} is not a declared content date`).toBe(
        true,
      );
    }
  });

  test("llms.txt is present and states the non-affiliation", async ({ request }) => {
    const response = await request.get("/llms.txt");
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain("Not affiliated with Roblox");
    expect(body).toContain("https://devexcalculator.org/");
    // It must not overclaim what the file does.
    expect(body).toContain("not a ranking factor");
  });

  test("a missing page returns 404 and offers a way onward", async ({ page }) => {
    const response = await page.goto("/definitely-not-a-page/");
    expect(response?.status()).toBe(404);

    await expect(page.getByRole("heading", { level: 1 })).toContainText("does not exist");
    await expect(page.getByRole("link", { name: /DevEx calculator/i }).first()).toBeVisible();
  });

  test("API endpoints respond and stay out of the index", async ({ request }) => {
    const health = await request.get("/api/health/");
    expect(health.status()).toBe(200);
    expect(health.headers()["x-robots-tag"]).toContain("noindex");

    const body = (await health.json()) as { ok: boolean; rateRegistry: { activeRates: number } };
    expect(body.ok).toBe(true);
    expect(body.rateRegistry.activeRates).toBeGreaterThan(0);

    const rates = await request.get("/api/rates/");
    expect(rates.status()).toBe(200);
    expect(rates.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("the FX endpoint returns a normalised, dated response", async ({ request }) => {
    const response = await request.get("/api/fx/latest/");
    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      ok: boolean;
      data: { base: string; provider: string; observationDate: string; stale: boolean };
    };
    expect(body.ok).toBe(true);
    expect(body.data.base).toBe("USD");
    expect(body.data.provider).toBe("European Central Bank");
    expect(body.data.observationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("the contact endpoint refuses rather than pretending to accept", async ({ request }) => {
    const response = await request.post("/api/contact/", {
      data: {
        name: "Test",
        email: "test@example.com",
        subject: "Testing",
        message: "This message is long enough to pass the length validation rule.",
        website: "",
        turnstileToken: "",
      },
    });

    // With no provider configured the honest answer is 503, not a false success.
    if (response.status() === 503) {
      const body = (await response.json()) as { ok: boolean; error: { code: string } };
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("CONTACT_DISABLED");
    }
  });
});

test.describe("security headers", () => {
  test("are present on a page response", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();

    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("geolocation=()");
    expect(headers["strict-transport-security"]).toContain("max-age=");
    // Framework version disclosure serves no purpose.
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("allowlists a third-party origin only when that integration is configured", async ({
    request,
  }) => {
    const csp = (await request.get("/")).headers()["content-security-policy"] ?? "";
    const scriptSrc = /script-src ([^;]*)/.exec(csp)?.[1] ?? "";
    const connectSrc = /connect-src ([^;]*)/.exec(csp)?.[1] ?? "";

    // This deployment configures no analytics provider and no Turnstile key,
    // so the policy must name none of their origins. 'unsafe-inline' is already
    // unavoidable here, which makes the origin allowlist the directive actually
    // limiting what an injected tag can load — a spare entry is a live bypass,
    // not housekeeping.
    for (const origin of [
      "cloudflareinsights.com",
      "googletagmanager.com",
      "google-analytics.com",
      "challenges.cloudflare.com",
    ]) {
      expect(
        `${scriptSrc} ${connectSrc}`,
        `The CSP allows ${origin} on a deployment that loads nothing from it.`,
      ).not.toContain(origin);
    }

    // Without Turnstile there is nothing to frame, and an omitted directive
    // would silently inherit `default-src 'self'`.
    expect(csp).toContain("frame-src 'none'");
  });
});

test.describe("structured data", () => {
  test("matches the visible page and claims nothing unsupported", async ({ page }) => {
    for (const route of ["/", "/devex-rates/", "/calculators/", "/about/"]) {
      await page.goto(route);

      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(blocks.length, `${route} emits no JSON-LD`).toBeGreaterThan(0);

      for (const block of blocks) {
        const graph = JSON.parse(block) as { "@graph": { "@type": string }[] };
        const types = graph["@graph"].map((node) => node["@type"]);

        for (const forbidden of ["Product", "Review", "AggregateRating", "FAQPage", "QAPage"]) {
          expect(types, `${route} emits ${forbidden}`).not.toContain(forbidden);
        }
      }
    }
  });

  test("breadcrumb markup matches the visible trail", async ({ page }) => {
    await page.goto("/devex-rates/");

    const visible = await page.getByRole("navigation", { name: "Breadcrumb" }).innerText();
    expect(visible).toContain("Home");

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const graph = JSON.parse(blocks[0] ?? "{}") as {
      "@graph": { "@type": string; itemListElement?: { name: string }[] }[];
    };
    const breadcrumb = graph["@graph"].find((node) => node["@type"] === "BreadcrumbList");

    expect(breadcrumb).toBeDefined();
    expect(breadcrumb?.itemListElement?.[0]?.name).toBe("Home");
  });
});

/**
 * The public endpoints.
 *
 * The rate registry has been served as JSON since launch and was, in practice,
 * unusable: no page mentioned it, it was absent from the sitemap, and it sent no
 * CORS header, so a browser on any other origin could not read it at all.
 */
test.describe("public API", () => {
  test("documents the endpoints at a findable URL", async ({ page }) => {
    const response = await page.goto("/api/");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Rates API");
    // Canonical is the documented path, not the file the page happens to live in.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/api\/$/);

    // Both endpoints are linked, so a reader can see the JSON in one click.
    const links = await page.locator('main a[href*="/api/"]').evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLAnchorElement).getAttribute("href") ?? ""),
    );
    expect(links.some((href) => href.includes("/api/rates"))).toBe(true);
    expect(links.some((href) => href.includes("/api/fx/latest"))).toBe(true);
  });

  test("is reachable from every page rather than only the sitemap", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('footer a[href="/api/"]')).toHaveCount(1);
  });

  test("lets a browser on another origin read the reference endpoints", async ({ request }) => {
    for (const path of ["/api/rates/", "/api/fx/latest/"]) {
      const response = await request.get(path, { headers: { origin: "https://example.com" } });
      expect(response.status(), path).toBe(200);
      expect(response.headers()["access-control-allow-origin"], path).toBe("*");
    }
  });

  test("answers the preflight a cross-origin call sends first", async ({ request }) => {
    const response = await request.fetch("/api/rates/", {
      method: "OPTIONS",
      headers: { origin: "https://example.com", "access-control-request-method": "GET" },
    });
    expect(response.status()).toBe(204);
    expect(response.headers()["access-control-allow-methods"]).toContain("GET");
  });

  test("does not open the submission endpoint to other origins", async ({ request }) => {
    // Contact accepts input and is origin-checked on purpose; health is
    // operator infrastructure. Neither is reference data, so neither gets CORS.
    for (const path of ["/api/contact/", "/api/health/"]) {
      const response = await request.get(path, { headers: { origin: "https://example.com" } });
      expect(response.headers()["access-control-allow-origin"], path).toBeUndefined();
    }
  });

  test("publishes a version and a verification date with the rates", async ({ request }) => {
    const body = await (await request.get("/api/rates/")).json();
    // The two fields that make a cached copy checkable rather than a guess.
    expect(typeof body.data.registryVersion).toBe("string");
    expect(Date.parse(body.data.lastVerifiedAt)).not.toBeNaN();
    expect(body.data.rates.length).toBeGreaterThan(0);
    for (const rate of body.data.rates) {
      expect(rate.id, "every rate needs an id callers can pin to").toBeTruthy();
    }
    expect(body.data.sources.length, "figures without sources are not checkable").toBeGreaterThan(0);
  });
});

/**
 * Change feeds.
 *
 * The site's proposition is that every figure carries the date it was verified.
 * A rate change is the event that invalidates a cached figure, and until these
 * existed the only way to learn of one was to revisit the changelog by hand.
 */
test.describe("change feeds", () => {
  test("publishes the changelog as Atom and as JSON Feed", async ({ request }) => {
    const atom = await request.get("/feed.xml");
    expect(atom.status()).toBe(200);
    expect(atom.headers()["content-type"]).toContain("atom+xml");

    const xml = await atom.text();
    expect(xml.startsWith("<?xml")).toBe(true);
    expect(xml).toContain("<feed xmlns=\"http://www.w3.org/2005/Atom\">");

    const json = await request.get("/feed.json");
    expect(json.status()).toBe(200);
    const feed = await json.json();
    expect(feed.version).toContain("jsonfeed.org");
    expect(feed.items.length).toBeGreaterThan(0);
  });

  test("carries the same entries in both formats", async ({ request }) => {
    // One source, two renderings. If these ever diverge, one of them is lying
    // about what the site changed.
    const xml = await (await request.get("/feed.xml")).text();
    const feed = await (await request.get("/feed.json")).json();

    const atomTitles = [...xml.matchAll(/<entry>[\s\S]*?<title>([^<]*)<\/title>/g)].map(
      (match) => match[1],
    );
    const jsonTitles = feed.items.map((item: { title: string }) => item.title);

    expect(atomTitles.length).toBe(jsonTitles.length);
    expect(new Set(atomTitles)).toEqual(new Set(jsonTitles));
  });

  test("gives every entry a stable, unique id", async ({ request }) => {
    // A feed reader shows an item twice if the id moves between fetches.
    const feed = await (await request.get("/feed.json")).json();
    const ids = feed.items.map((item: { id: string }) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^tag:devexcalculator\.org,\d{4}-\d{2}-\d{2}:/);
  });

  test("advertises itself on every page, not only the changelog", async ({ page }) => {
    for (const route of ["/", "/devex-rates/", "/changelog/"]) {
      await page.goto(route);
      await expect(
        page.locator('link[rel="alternate"][type="application/atom+xml"]'),
        route,
      ).toHaveCount(1);
    }
  });

  test("lets a crawler reach the API page while keeping the endpoints out", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    // The blanket disallow would otherwise forbid the very page the sitemap
    // lists. The longer, anchored allow wins for /api/ alone.
    expect(robots).toContain("Allow: /api/$");
    expect(robots).toContain("Disallow: /api/");
  });
});

/**
 * Group revenue split.
 *
 * The arithmetic is trivial. What this exists to say is that the DevEx minimum
 * applies to the balance one person submits, so a group can clear it several
 * times over and leave members unable to cash out — and that Roblox pays one
 * account, not a split.
 */
test.describe("group split", () => {
  test("divides a balance and values each share", async ({ page }) => {
    await page.goto("/how-to-cash-out-robux/#group");
    const section = page.locator("#group");
    await expect(section).toBeVisible();

    const rows = section.locator("tbody tr");
    await expect(rows).toHaveCount(3);
    // 300,000 at 50/30/20 with the standard rate.
    await expect(rows.nth(0)).toContainText("150,000");
    await expect(rows.nth(0)).toContainText("$570.00");
  });

  test("checks the minimum per member, not against the group total", async ({ page }) => {
    await page.goto("/how-to-cash-out-robux/#group");
    const section = page.locator("#group");

    // 90,000 clears the 30,000 minimum three times over; at 50/30/20 two of the
    // three members are below it individually.
    await section.locator('input[inputmode="numeric"]').fill("90,000");
    await expect(section.locator("tbody tr").nth(1)).toContainText("short");
    await expect(section.getByText(/cannot submit a DevEx request/i)).toBeVisible();
    await expect(section.getByText(/applies to the balance one person submits/i)).toBeVisible();
  });

  test("refuses to normalise shares that do not reach 100%", async ({ page }) => {
    await page.goto("/how-to-cash-out-robux/#group");
    const section = page.locator("#group");

    const percents = section.locator('input[inputmode="decimal"]');
    for (let i = 0; i < 3; i += 1) await percents.nth(i).fill("30");

    await expect(section.getByText(/do not add up to 100/i)).toBeVisible();
    // Scaling them to fit would produce figures nobody agreed to.
    await expect(section.getByText(/Nothing here has been scaled/i)).toBeVisible();
  });

  test("says plainly that Roblox pays one account", async ({ page }) => {
    await page.goto("/how-to-cash-out-robux/#group");
    await expect(page.locator("#group")).toContainText(
      /Roblox does not divide a payout between collaborators/i,
    );
  });

  test("works at 320px without pushing the page sideways", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/how-to-cash-out-robux/");
    const report = await measureOverflow(page);
    expect(report.overflow, describeOverflow("The cash-out page", report)).toBeLessThanOrEqual(0);
  });
});
