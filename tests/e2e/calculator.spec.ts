import { expect, test } from "@playwright/test";

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
    await expect(page.getByText("$380.00").first()).toBeVisible();
  });

  test("matches the figure Roblox publishes for the minimum", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Eligible Earned Robux").fill("30000");
    await expect(page.getByText("$114.00").first()).toBeVisible();
  });

  test("accepts shorthand and separators", async ({ page }) => {
    await page.goto("/");
    const amount = page.getByLabel("Eligible Earned Robux");

    await amount.fill("100k");
    await expect(page.getByText("$380.00").first()).toBeVisible();

    await amount.fill("1,000,000");
    await expect(page.getByText("$3,800.00").first()).toBeVisible();

    await amount.fill("1.5m");
    await expect(page.getByText("$5,700.00").first()).toBeVisible();
  });

  test("applies a preset", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "30K Robux" }).click();
    await expect(page.getByText("$114.00").first()).toBeVisible();
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
    await expect(page.getByText("$105.00").first()).toBeVisible();
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
    await expect(page.getByText("$374.00").first()).toBeVisible();
  });

  test("compares against a standard-only payout", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Split" }).click();
    await page.getByLabel(/Standard rate bucket/).fill("80000");
    await page.getByLabel(/Legacy balance rate bucket/).fill("20000");

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
    await expect(page.getByText("$273.60")).toBeVisible();
  });
});

test.describe("target mode", () => {
  test("rounds the requirement up to a whole Robux", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Target" }).click();
    await page.getByLabel("Payout target").fill("1000");

    // 1000 / 0.0038 = 263,157.89 -> 263,158
    await expect(page.getByText("263,158").first()).toBeVisible();
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
  test("renders a shared link's state into the server HTML", async ({ page }) => {
    const response = await page.goto("/?robux=100000&rate=standard-current");
    expect(response?.status()).toBe(200);

    // Present in the server response, not only after hydration.
    const html = (await response?.text()) ?? "";
    expect(html).toContain("380.00");
  });

  test("reflects the current calculation in the address bar", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Eligible Earned Robux").fill("250000");
    await expect(page).toHaveURL(/robux=250000/);
  });

  test("restores state after a reload", async ({ page }) => {
    await page.goto("/?robux=100000");
    await expect(page.getByText("$380.00").first()).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Eligible Earned Robux")).toHaveValue("100000");
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
    await expect(page.getByText("$380.00").first()).toBeVisible();
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
