/**
 * Removes translated keys that English no longer has.
 *
 * An orphan is harmless to render and a reliable sign a translation is
 * drifting from its source: the English sentence was rewritten or deleted, and
 * the other six languages still carry the old one. Deleting it is safe in a
 * way that adding one is not, so this is a script rather than a review task.
 *
 * `$comment` and `$identical` are metadata, not keys; an `$identical` entry for
 * a key that no longer exists goes with it.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { LAUNCH_LOCALES, DEFAULT_LOCALE } from "../../src/i18n/config";
import { flatten } from "../../src/i18n/coverage";

const LOCALES = join(process.cwd(), "src/i18n/locales");

function prune(node: Record<string, unknown>, keep: ReadonlySet<string>, prefix = ""): number {
  let removed = 0;
  for (const [key, value] of Object.entries(node)) {
    if (key === "$comment" || key === "$identical") continue;
    const path = prefix === "" ? key : `${prefix}.${key}`;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      removed += prune(value as Record<string, unknown>, keep, path);
      if (Object.keys(value as object).length === 0) delete node[key];
    } else if (!keep.has(path)) {
      delete node[key];
      removed += 1;
    }
  }
  return removed;
}

let total = 0;
for (const namespace of readdirSync(join(LOCALES, DEFAULT_LOCALE))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""))) {
  const source = JSON.parse(
    readFileSync(join(LOCALES, DEFAULT_LOCALE, `${namespace}.json`), "utf8"),
  );
  const keep = new Set(flatten(source).keys());

  for (const locale of LAUNCH_LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    const file = join(LOCALES, locale, `${namespace}.json`);
    if (!existsSync(file)) continue;
    const content = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    const removed = prune(content, keep);
    const identical = content.$identical;
    if (Array.isArray(identical)) {
      content.$identical = identical.filter((key) => keep.has(String(key)));
    }
    if (removed > 0) {
      writeFileSync(file, `${JSON.stringify(content, null, 2)}\n`, "utf8");
      console.log(`  ${locale}/${namespace}.json — ${removed} orphan(s) removed`);
      total += removed;
    }
  }
}
console.log(total === 0 ? "No orphans." : `\n  ${total} orphan(s) removed.`);
