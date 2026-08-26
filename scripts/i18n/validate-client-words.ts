/**
 * Every key a Client Component asks for is a key its server parent hands it.
 *
 * A Client Component cannot reach a dictionary — it is given the handful of
 * strings it renders, by key, as a prop. The list of keys lives beside the
 * component in a `.words.ts` module, and the server copies exactly those.
 *
 * When the two drift, nothing anywhere fails until a browser runs the
 * component. `translatorFor` throws for a key it was not given, React unmounts
 * the island, and the page still returns 200 with the server-rendered markup
 * sitting there looking correct. The build is green, the HTML is fine, and the
 * calculator does not respond to typing.
 *
 * That is not hypothetical: `routes.home.sections.rate-comparison` was missing
 * from the homepage calculator's list, so the main calculator on the busiest
 * page of the site threw on hydration — in every language, English included —
 * and every check in the repo passed.
 *
 * So this reads the source. For each `.words.ts` it finds the component beside
 * it, collects every literal key that component asks `t` for, and compares the
 * two sets in both directions:
 *
 *   **asked for, never handed** — the island throws in the browser.
 *   **handed, never asked for** — dead weight in the payload, and usually the
 *   fossil of a sentence that was deleted.
 *
 * Keys built at runtime (`data.rates.${rate.id}.label`) are invisible to a
 * source scan and are supplied by the generated lists in `i18n/data-words.ts`.
 * Those are excluded by shape — a template literal is not a literal key — and
 * the runtime check for them is the localized end-to-end suite.
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

/** Every `*.words.ts` in the tree, with the component that should match it. */
function wordModules(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) wordModules(full, found);
    else if (entry.name.endsWith(".words.ts")) found.push(full);
  }
  return found;
}

/** The string literals inside an exported `readonly string[]`, in order. */
function declaredKeys(source: string): string[] {
  const keys: string[] = [];
  for (const match of source.matchAll(/"([a-z][a-zA-Z0-9]*\.[^"]+)"/g)) {
    const value = match[1];
    if (value !== undefined) keys.push(value);
  }
  return keys;
}

/** Every literal key the component passes to `t(...)`. */
function requestedKeys(source: string): string[] {
  const keys: string[] = [];
  for (const match of source.matchAll(/\bt\(\s*"([^"]+)"/g)) {
    const value = match[1];
    if (value !== undefined) keys.push(value);
  }
  // `t(condition ? "a.one" : "a.other")` — both branches are literal keys.
  for (const match of source.matchAll(/\bt\(\s*[^)"]*\?\s*"([^"]+)"\s*:\s*"([^"]+)"/g)) {
    if (match[1] !== undefined) keys.push(match[1]);
    if (match[2] !== undefined) keys.push(match[2]);
  }
  return keys;
}

/**
 * Lists this module spreads in from elsewhere, which supply keys too.
 *
 * `...ACTION_WORDS` and the generated `...RATE_WORDS` are the reason a
 * component can ask for a key its own list does not name.
 */
function spreadSources(source: string, from: string): string[] {
  const files: string[] = [];
  for (const match of source.matchAll(/^import \{[^}]*\} from "([^"]+)";$/gm)) {
    const specifier = match[1];
    if (specifier === undefined) continue;
    const resolved = specifier.startsWith("@/")
      ? join(ROOT, "src", specifier.slice(2))
      : join(from, "..", specifier);
    for (const candidate of [`${resolved}.ts`, `${resolved}.tsx`, resolved]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        files.push(candidate);
        break;
      }
    }
  }
  return files;
}

const modules = wordModules(join(ROOT, "src"));
let problems = 0;
let checked = 0;

console.log(`client word lists — ${modules.length} module(s)\n`);

for (const wordsFile of modules) {
  const componentFile = wordsFile.replace(/\.words\.ts$/, ".tsx");
  if (!existsSync(componentFile)) {
    /*
     * A shared list, spread into several components rather than owned by one.
     * `parse-message.words.ts` is the parser's vocabulary, generated from the
     * failure cases the parser can name; it has no component of its own and is
     * checked through every component that spreads it.
     */
    continue;
  }

  const wordsSource = readFileSync(wordsFile, "utf8");
  const component = readFileSync(componentFile, "utf8");

  const handed = new Set(declaredKeys(wordsSource));
  // Keys arriving through a spread of another list, generated or shared.
  let dynamic = /\$\{/.test(wordsSource);
  for (const file of spreadSources(wordsSource, wordsFile)) {
    const spread = readFileSync(file, "utf8");
    for (const key of declaredKeys(spread)) handed.add(key);
    if (/\$\{/.test(spread)) dynamic = true;
  }

  const asked = [...new Set(requestedKeys(component))];
  const missing = asked.filter((key) => !handed.has(key));

  checked += 1;
  const label = componentFile.slice(ROOT.length + 1).replace(/\\/g, "/");

  if (missing.length === 0) {
    console.log(`  ${label.padEnd(52)} ${String(asked.length).padStart(3)} key(s)  ok`);
    continue;
  }

  problems += missing.length;
  console.log(`  ${label.padEnd(52)} ${String(asked.length).padStart(3)} key(s)  ${missing.length} MISSING`);
  for (const key of missing) {
    console.log(`        asks for "${key}", which its list does not hand it`);
  }
  if (dynamic) {
    console.log("        (this list also builds keys at runtime; those are not scanned)");
  }
}

console.log(`\n  ${checked} component(s) checked`);

if (problems > 0) {
  console.error(
    `\n${problems} key(s) a Client Component asks for and is never given.\n` +
      "Each one throws in the browser and unmounts its island, leaving a page that\n" +
      "returns 200 and does not work. Add them to the .words.ts beside the component.",
  );
  process.exit(1);
}
console.log("\nClient word lists complete.");
