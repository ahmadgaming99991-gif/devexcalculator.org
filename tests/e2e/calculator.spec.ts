import { expect, test, type Page } from "@playwright/test";

/**
 * Calculator behaviour.
 *
 * These assert the numbers a creator would actually plan around, using the
 * figures Roblox publishes: 30,000 Earned Robux is 114 dollars, 100,000 is 380.
 * If a rate change ever slips through without the content being updated, these
 * fail alongside the unit tests.
 */

test.describe("quick mode", () => {
  test("converts an amount at the standard rate", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Eligible Earned Robux").fill("100000");
    await expect(page.getByTestId("primary-result")).toHaveText("$380.00");
  });

  test("matches the figure Roblox publishes for the minimum", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Eligible Earned Robux").fill("30000");
    await expect(page.getByTestId("primary-result")).toHaveText("$114.00");
  });

  test("accepts shorthand and separators", async ({ page }) => {
    await page.goto("/");
    const amount = page.getByLabel("Eligible Earned Robux");

    await amount.fill("100k");
    await expect(page.getByTestId("primary-result")).toHaveText("$380.00");

    await amount.fill("1,000,000");
    await expect(page.getByTestId("primary-result")).toHaveText("$3,800.00");

    await amount.fill("1.5m");
    await expect(page.getByTestId("primary-result")).toHaveText("$5,700.00");
  });

  test("applies a preset", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "30K Robux" }).click();
    await expect(page.getByTestId("primary-result")).toHaveText("$114.00");
  });

  test("shows an actionable error and keeps the value the user typed", async ({ page }) => {
    await page.goto("/");
    const amount = page.getByLabel("Eligible Earned Robux");
    await amount.fill("abc");

    await expect(page.getByRole("alert").first()).toBeVisible();
    // The user's input is preserved so they can correct it.
    await expect(amount).toHaveValue("abc");
  });

  test("labels the input cap as this site's limit, not a Roblox rule", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Eligible Earned Robux").fill("999999999999");
    await expect(page.getByText(/not a Roblox limit/i)).toBeVisible();
  });

  test("switches rates and shows the legacy figure", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Eligible Earned Robux").fill("30000");
    await page.getByLabel("Rate to apply").selectOption("legacy-pre-2025-09-05");
    await expect(page.getByTestId("primary-result")).toHaveText("$105.00");
  });
});

test.describe("threshold", () => {
  test("reports below the minimum without calling it ineligible", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Eligible Earned Robux").fill("10000");

    await expect(page.getByText("Below the stated minimum")).toBeVisible();
    await expect(page.getByText("20,000 more needed")).toBeVisible();
  });

  test("never claims the user is eligible once the minimum is met", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Eligible Earned Robux").fill("50000");

    await expect(page.getByText("Meets the stated minimum")).toBeVisible();
    // The wording must stay away from any claim of approval.
    await expect(page.getByText(/you are eligible/i)).toHaveCount(0);
    await expect(page.getByText(/not an approval/i).first()).toBeVisible();
  });
});

test.describe("advanced split mode", () => {
  test("sums buckets without double counting", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Split" }).click();

    await page.getByLabel(/Standard rate bucket/).fill("80000");
    await page.getByLabel(/Legacy balance rate bucket/).fill("20000");

    // 80,000 x 0.0038 + 20,000 x 0.0035 = 304 + 70
    await expect(page.getByTestId("primary-result")).toHaveText("$374.00");
  });

  test("compares against a standard-only payout", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Split" }).click();
    await page.getByLabel(/Standard rate bucket/).fill("80000");
    await page.getByLabel(/Legacy balance rate bucket/).fill("20000");

    /*
     * Deliberately not `primary-result`: the primary figure here is $374.00,
     * and $380.00 is the standard-only comparison this test exists to check.
     */
    await expect(page.getByText("$380.00").first()).toBeVisible();
  });

  test("applies optional fees and a tax estimate", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Split" }).click();
    await page.getByLabel(/Standard rate bucket/).fill("100000");

    await page.getByText("Optional: payment fees and your own tax estimate").click();
    await page.getByLabel("Payment provider fee").fill("10");
    await page.getByLabel("Your own tax estimate").fill("20");

    // 380 - 38 = 342, then 342 - 68.40 = 273.60
    /*
     * Not `primary-result`: that carries the gross figure. $273.60 is the net
     * after the fee and tax deductions, which lives in the breakdown.
     */
    await expect(page.getByText("$273.60")).toBeVisible();
  });
});

test.describe("target mode", () => {
  test("rounds the requirement up to a whole Robux", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Target" }).click();
    await page.getByLabel("Payout target").fill("1000");

    // 1000 / 0.0038 = 263,157.89 -> 263,158
    await expect(page.getByTestId("primary-result")).toContainText("263,158");
  });

  test("warns that the minimum applies to a small target", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Target" }).click();
    await page.getByLabel("Payout target").fill("50");

    await expect(page.getByText("The minimum applies first")).toBeVisible();
  });

  test("shows progress against a current balance", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Target" }).click();
    await page.getByLabel("Payout target").fill("1000");
    await page.getByLabel(/current balance/i).fill("131579");

    await expect(page.getByText("50% of the way there")).toBeVisible();
  });
});

test.describe("shareable state", () => {
  /*
   * This used to assert the opposite: that "380.00" was already in the server
   * response. It was, because the page read the query string on the server —
   * and that one dependency made the whole document a request-time render in
   * every published locale. On 2026-09-02 that render stopped fitting the
   * Workers Free plan's CPU allowance: production served `error 1102` on this
   * URL whenever the edge cache did not cover the request. A document nobody can open is worse than one that computes a
   * moment after it paints.
   *
   * So the contract moved rather than weakened. The document is prerendered
   * and identical for every reader; the shared state is applied by the island
   * that already owns the address bar, during the hydration commit.
   */
  test("serves a shared link from the prerendered document", async ({ page, request }) => {
    /*
     * The property, stated exactly: the delivered document does not depend on
     * the query string. Asserting that some computed figure is absent would
     * not say that — "380.00" is also the hundred-thousand row of the popular
     * amounts table, which is on the page either way, and an assertion that
     * passes for the wrong reason is worse than none.
     */
    const shared = await request.get("/?robux=100000&rate=standard-current");
    const plain = await request.get("/");

    expect(shared.status()).toBe(200);
    expect(plain.status()).toBe(200);
    expect(await shared.text()).toBe(await plain.text());

    await page.goto("/?robux=100000&rate=standard-current");
    await expect(page.getByLabel("Eligible Earned Robux")).toHaveValue("100000");
  });

  test("applies a shared link's state once hydrated", async ({ page }) => {
    await page.goto("/?robux=100000&rate=standard-current");
    await expect(page.getByLabel("Eligible Earned Robux")).toHaveValue("100000");
    await expect(page.getByTestId("primary-result")).toHaveText("$380.00");
  });

  test("opens a shared link on the mode it names", async ({ page }) => {
    await page.goto("/?target=1000");
    await expect(page.getByRole("tab", { name: "Target" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByLabel("Payout target")).toHaveValue("1000");
  });

  test("a shared link does not swallow the first Back press", async ({ page }) => {
    /*
     * Adopting the URL at hydration changes the mode without the reader having
     * touched anything. If that counted as a deliberate mode change it would
     * push a history entry on load, and the first Back would land the reader
     * on the same page they were already looking at.
     */
    await page.goto("/devex-rates/");
    await page.goto("/?target=1000");
    await expect(page.getByRole("tab", { name: "Target" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await page.goBack();
    await expect(page).toHaveURL(/\/devex-rates\/$/);

    await page.goForward();
    await expect(page.getByRole("tab", { name: "Target" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("reflects the current calculation in the address bar", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Eligible Earned Robux").fill("250000");
    await expect(page).toHaveURL(/robux=250000/);
  });

  test("restores state after a reload", async ({ page }) => {
    await page.goto("/?robux=100000");
    await expect(page.getByTestId("primary-result")).toHaveText("$380.00");
    await page.reload();
    await expect(page.getByLabel("Eligible Earned Robux")).toHaveValue("100000");
  });

  test("never blanks a shared link's query while it loads", async ({ page }) => {
    /*
     * The address bar was rewritten to `/` on the hydration commit and put
     * back a tick later. It self-corrected, so it looked harmless — but
     * anything reading the URL inside that window got the stripped one, and a
     * reload there loses the calculation the link existed to carry. The test
     * above only caught it about one run in six, and only once GA4 gave the
     * main thread enough work to widen the gap.
     *
     * So this watches the URL across the whole load instead of sampling it
     * at the end.
     */
    const seen: string[] = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) seen.push(frame.url());
    });

    await page.goto("/?robux=100000");
    await expect(page.getByTestId("primary-result")).toHaveText("$380.00");

    // Poll through the window the race lived in.
    for (let i = 0; i < 20; i += 1) {
      seen.push(page.url());
      await page.waitForTimeout(50);
    }

    const stripped = seen.filter((url) => !url.includes("robux=100000"));
    expect(stripped, "the query was dropped from the address bar mid-load").toEqual([]);
  });

  test("ignores a hostile query parameter", async ({ page }) => {
    await page.goto("/?robux=%3Cscript%3Ealert(1)%3C%2Fscript%3E&rate=made-up");
    await expect(page.getByLabel("Eligible Earned Robux")).toHaveValue("");
    // Falls back to the documented default rate rather than failing.
    await expect(page.getByLabel("Rate to apply")).toHaveValue("standard-current");
  });

  test("supports back navigation between modes", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Split" }).click();
    await expect(page).toHaveURL(/mode=advanced/);
    await page.goBack();
    await expect(page.getByRole("tab", { name: "Quick" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

test.describe("copy, share and reset", () => {
  test("copies the result and announces it", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "Clipboard permissions are Chromium-specific.");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/");
    await page.getByLabel("Eligible Earned Robux").fill("100000");
    await page.getByRole("button", { name: "Copy result" }).click();

    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe("$380.00");
  });

  test("confirms before discarding entered data", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Eligible Earned Robux").fill("100000");

    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.getByRole("button", { name: "Confirm reset" })).toBeVisible();

    await page.getByRole("button", { name: "Confirm reset" }).click();
    await expect(page.getByLabel("Eligible Earned Robux")).toHaveValue("");
  });

  test("disables reset when there is nothing to lose", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Reset", exact: true })).toBeDisabled();
  });
});

test.describe("local currency", () => {
  test("keeps the USD calculator working when the FX provider fails", async ({ page }) => {
    // Matches the request the hook actually makes, `/api/fx/latest/`. A
    // trailing `/**` glob does not match that path.
    await page.route("**/api/fx/**", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        // The exact body the real endpoint returns when it cannot serve
        // rates, so this exercises the production contract rather than a
        // convenient stand-in.
        body: JSON.stringify({
          ok: false,
          error: {
            code: "FX_UNAVAILABLE",
            message:
              "Local-currency estimates are temporarily unavailable. The USD calculator still works.",
          },
        }),
      }),
    );

    await page.goto("/");
    await page.getByLabel("Eligible Earned Robux").fill("100000");
    await page.getByLabel("Show result in").selectOption("GBP");

    // The USD figure survives, and the failure is explained rather than hidden.
    await expect(page.getByTestId("primary-result")).toHaveText("$380.00");
    await expect(page.getByText(/temporarily unavailable/i)).toBeVisible();
  });

  test("labels a converted figure with its provider and observation date", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Eligible Earned Robux").fill("100000");
    await page.getByLabel("Show result in").selectOption("EUR");

    await expect(page.getByText(/European Central Bank reference rates/)).toBeVisible();
    await expect(page.getByText(/not bank quotes/)).toBeVisible();
  });
});

test.describe("history", () => {
  test("saves and clears a calculation locally", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Eligible Earned Robux").fill("100000");

    await page.getByText(/Saved calculations/).click();
    await page.getByRole("button", { name: "Save this calculation" }).click();
    await expect(page.getByText("100,000 Robux")).toBeVisible();

    await page.getByRole("button", { name: "Clear history" }).click();
    await expect(page.getByText("Nothing saved yet.")).toBeVisible();
  });
});

test.describe("marketplace fee calculator", () => {
  test("computes the 70% creator share on an in-experience sale", async ({ page }) => {
    await page.goto("/robux-tax-calculator/");
    await page.getByLabel("Sale price").fill("1000");
    await expect(page.getByText("700").first()).toBeVisible();
  });

  test("computes the price needed to clear a target", async ({ page }) => {
    await page.goto("/robux-tax-calculator/");
    await page.getByRole("tab", { name: "What to charge" }).click();
    await page.getByLabel("Robux you want to keep").fill("1000");
    // 1000 / 0.7 = 1428.57 -> 1429
    await expect(page.getByText("1,429").first()).toBeVisible();
  });

  test("applies the progressive Marketplace tier", async ({ page }) => {
    await page.goto("/robux-tax-calculator/");
    await page.getByLabel("What are you selling?").selectOption("marketplace-avatar-item");
    await page.getByLabel("Sale price").fill("1000");
    await page.getByLabel(/multiple of the price floor/).fill("6");
    await expect(page.getByText("700").first()).toBeVisible();
  });
});

/**
 * What the reader does before the page is interactive.
 *
 * The calculator's controls are server-rendered but React-controlled, so
 * anything done to them before hydration is overwritten by the first commit
 * unless something outside React caught it. `early-input.ts` is that something,
 * and these are the tests it never had — the original fix was measured by hand
 * and then had no guard, which is how the same bug came back for presets.
 *
 * Throttling is the whole test. Without it hydration wins the race on a
 * developer machine every time, so an unthrottled version passes whether the
 * mechanism works or not: removing the listener entirely left it green. At 6x
 * CPU on a 400 kbps link the window is wide enough to be real, and both of
 * these failed 4 times out of 4 before their fix.
 */
test.describe("before hydration", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "CDP throttling is Chromium-only.");

  async function throttle(page: Page) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 300,
      downloadThroughput: (400 * 1024) / 8,
      uploadThroughput: (400 * 1024) / 8,
    });
  }

  test("keeps what was typed", async ({ page }) => {
    await throttle(page);
    await page.goto("/", { waitUntil: "commit" });

    const amount = page.getByLabel("Eligible Earned Robux");
    await amount.click({ timeout: 20_000 });
    await page.keyboard.type("100000");

    await expect(amount).toHaveValue("100000", { timeout: 20_000 });
    await expect(page.getByTestId("primary-result")).toHaveText("$380.00", { timeout: 20_000 });
  });

  test("keeps a preset that was tapped", async ({ page }) => {
    await throttle(page);
    await page.goto("/", { waitUntil: "commit" });

    await page.getByRole("button", { name: "30K Robux" }).click({ timeout: 20_000 });

    await expect(page.getByTestId("primary-result")).toHaveText("$114.00", { timeout: 20_000 });
    await expect(page.getByLabel("Eligible Earned Robux")).toHaveValue("30000");
  });
});
