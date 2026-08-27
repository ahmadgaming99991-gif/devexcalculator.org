/**
 * A `{token}` a reader can see.
 *
 * **Why this is its own check.** Every placeholder on this site is filled by
 * one of two translators — the server's, and the one a Client Component uses
 * after it hydrates. When the registry figures moved into `src/i18n/figures.ts`
 * only the server translator was given them, and three strings an island
 * renders carried `{minimumRobux}`. The braces would have appeared in the
 * browser, on the results summary, after hydration.
 *
 * Nothing would have caught it. `validate-interpolation` reads call sites and
 * those strings have no values at their call site by design. `validate-i18n`
 * compares tokens between languages and both sides declared the same one. The
 * leakage detector counts English words and a brace is not one. It was found by
 * fetching seventy pages by hand and grepping — which is not a check, it is a
 * thing somebody remembered to do once.
 *
 * So: fetch every indexable route in every language this build renders,
 * English included, strip the parts a reader never sees, and fail on a brace.
 *
 * Deliberately reads the rendered HTML rather than the catalogs, because the
 * failure mode is a token that resolves in one renderer and not the other, and
 * only the page knows which renderer ran.
 *
 *     ENABLE_REVIEW_LOCALES=true npm run build && npm start -- --port 3210
 *     npx tsx scripts/i18n/validate-rendered-tokens.ts http://127.0.0.1:3210
 */

import { renderableLocales } from "../../src/i18n/visibility";
import { indexableRoutes } from "../../src/lib/content/route-registry";

const origin = process.argv[2] ?? "";
if (!origin || !/^https?:\/\//.test(origin)) {
  console.error(
    "Usage: tsx scripts/i18n/validate-rendered-tokens.ts <origin>\n" +
      "The origin must be a running server; add ENABLE_REVIEW_LOCALES=true to cover every locale.",
  );
  process.exit(1);
}

/**
 * What a reader actually sees.
 *
 * Scripts are stripped because the RSC payload legitimately carries unfilled
 * templates: a Client Component is handed `"verified {date}"` as a word and
 * fills it in the browser. Those are the input to the thing being checked, not
 * a defect, and counting them would make this fail on every page forever.
 */
function visible(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .split(/<[^>]*>/)
    .join(" ");
}

/** `{name}` — the interpolation syntax, not CSS or JSON left in the markup. */
const TOKEN = /\{[a-zA-Z_][a-zA-Z0-9_]*\}/g;

interface Leak {
  readonly url: string;
  readonly tokens: readonly string[];
}

async function main(): Promise<void> {
  const locales = renderableLocales();
  const routes = indexableRoutes.map((record) => record.route);
  console.log(`rendered tokens — ${routes.length} route(s) × ${locales.length} locale(s)\n`);

  const leaks: Leak[] = [];
  let checked = 0;
  let failed = false;

  for (const meta of locales) {
    const found: Leak[] = [];
    for (const route of routes) {
      const url = `${meta.prefix}${route}`;
      try {
        const response = await fetch(`${origin}${url}`);
        if (!response.ok) throw new Error(`${response.status}`);
        checked += 1;
        const tokens = [...new Set(visible(await response.text()).match(TOKEN) ?? [])];
        if (tokens.length > 0) found.push({ url, tokens });
      } catch (error) {
        console.error(`  ${meta.locale}  ${url}  ${String(error)}`);
        failed = true;
      }
    }
    console.log(
      `  ${meta.locale.padEnd(6)} ${String(found.length).padStart(3)} page(s) with an unfilled token`,
    );
    leaks.push(...found);
  }

  if (leaks.length > 0) {
    console.error("");
    for (const leak of leaks) console.error(`  ${leak.url}  ${leak.tokens.join(" ")}`);
    console.error(
      `\n${leaks.length} page(s) show a reader a placeholder.\n` +
        "A token filled by one translator and not the other is the usual cause; see src/i18n/figures.ts.",
    );
    process.exit(1);
  }

  if (failed) {
    console.error("\nSome pages could not be read.");
    process.exit(1);
  }
  console.log(`\nNo unfilled token on any of the ${checked} page(s) checked.`);
}

void main();
