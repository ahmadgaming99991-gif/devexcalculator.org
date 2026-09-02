/**
 * The routes that must not be rendered per request, asserted from the build.
 *
 * A source-level guard already forbids `searchParams` on these routes
 * (tests/unit/features/static-calculator-routes.test.ts). This is the other
 * half: it reads what Next actually produced, because the ways a route falls
 * back to a request-time render are not all visible in its own file — a
 * dynamic API reached through a shared component does it too, and silently.
 *
 * Why these routes specifically. `/` and `/devex-fees-and-taxes/` host the
 * calculator, and they read the shared link from `searchParams` on the server,
 * which made both documents dynamic in all seven published locales. On the
 * Workers Free plan a request-time render is bounded by 10 ms of CPU. On
 * 2026-09-02 that render stopped fitting: `wrangler tail` recorded
 * `outcome: exceededCpu` on `https://devexcalculator.org/`, and readers whose
 * request was not covered by the edge cache were served `error 1102`.
 *
 * A cache header is not a substitute and was not accepted as one. Cached, the
 * page is fast until the entry expires and then one reader pays the render and
 * gets the error. Prerendered, no reader pays it at all.
 *
 * Run after `npm run build`.
 */
import { readFileSync } from "node:fs";
import { publicLocales } from "../../src/i18n/visibility";
import { localizedPath } from "../../src/i18n/locale-path";

/** Routes whose every published localisation must be a prerendered document. */
const MUST_BE_STATIC: readonly string[] = ["/", "/devex-fees-and-taxes/"];

const MANIFEST = ".next/prerender-manifest.json";

/** Manifest keys carry no trailing slash; the site's paths do. */
function manifestKey(path: string): string {
  return path === "/" ? "/" : path.replace(/\/$/, "");
}

function main(): void {
  let manifest: { routes?: Record<string, unknown> };
  try {
    manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as { routes?: Record<string, unknown> };
  } catch {
    console.error(`\nCannot read ${MANIFEST}. Run \`npm run build\` first.`);
    process.exit(1);
  }

  const prerendered = new Set(Object.keys(manifest.routes ?? {}));
  const locales = publicLocales();
  const missing: string[] = [];
  const found: string[] = [];

  for (const route of MUST_BE_STATIC) {
    for (const meta of locales) {
      const path = localizedPath(meta.locale, route);
      const key = manifestKey(path);
      if (prerendered.has(key)) found.push(path);
      else missing.push(`${path} (manifest key ${key})`);
    }
  }

  const expected = MUST_BE_STATIC.length * locales.length;
  console.log(`\nBuild route classification — ${locales.length} published locale(s)`);
  for (const path of found) console.log(`  prerendered  ${path}`);
  for (const path of missing) console.log(`  DYNAMIC      ${path}`);

  if (missing.length > 0) {
    console.error(
      `\n${missing.length} of ${expected} document(s) still render at request time.\n` +
        "Each one is a Worker page render on the Free plan's 10 ms CPU budget.\n" +
        "Find what made the route dynamic — most often `searchParams`, `cookies()`,\n" +
        "`headers()`, or a route-segment `dynamic`/`revalidate` export — and remove it.\n" +
        "Do not paper over it with a cache header.",
    );
    process.exit(1);
  }

  console.log(`\n  ${expected}/${expected} prerendered. Route classification passed.`);
}

main();
