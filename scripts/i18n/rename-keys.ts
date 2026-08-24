/**
 * Renames dictionary keys across every locale at once.
 *
 * Run as `npm run i18n:rename -- <namespace> <old> <new> [<old> <new> …]`.
 *
 * The extractors name keys after where a string sat on the page —
 * `shell.body.intro.p1` is the first paragraph of the intro section of the
 * shell. That is the right rule for prose, where a name derived from the text
 * would change on every typo fix. It is the wrong name for a UI label that a
 * component reaches for by hand: `t("common.shell.body.intro.p1")` tells the
 * next reader nothing, and the one after that adds a second key rather than
 * find it.
 *
 * Renaming by hand means seven files per key, and the failure is silent in
 * six of them — English renders, a locale throws only on the page that uses
 * it. So it happens here, for every locale in one pass, `$identical` entries
 * moved with the key they describe.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { localeRegistry } from "../../src/i18n/config";

const ROOT = process.cwd();
const LOCALES = join(ROOT, "src/i18n/locales");

type Node = Record<string, unknown>;

function getDeep(root: Node, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>((node, key) => {
    if (node === null || typeof node !== "object") return undefined;
    return (node as Node)[key];
  }, root);
}

function setDeep(root: Node, dotted: string, value: unknown): void {
  const parts = dotted.split(".");
  let node = root;
  for (const key of parts.slice(0, -1)) {
    const next = node[key];
    node = (typeof next === "object" && next !== null ? next : (node[key] = {})) as Node;
  }
  node[parts[parts.length - 1] as string] = value;
}

/** Removes a key and any parent objects it leaves empty behind it. */
function deleteDeep(root: Node, dotted: string): void {
  const parts = dotted.split(".");
  const chain: Node[] = [root];
  let node: Node = root;
  for (const key of parts.slice(0, -1)) {
    const next = node[key];
    if (typeof next !== "object" || next === null) return;
    node = next as Node;
    chain.push(node);
  }
  delete node[parts[parts.length - 1] as string];
  for (let i = chain.length - 1; i > 0; i -= 1) {
    const current = chain[i] as Node;
    if (Object.keys(current).length > 0) break;
    const parent = chain[i - 1] as Node;
    const name = parts[i - 1] as string;
    delete parent[name];
  }
}

const [namespace, ...pairs] = process.argv.slice(2);
if (!namespace || pairs.length === 0 || pairs.length % 2 !== 0) {
  console.error("Usage: i18n:rename -- <namespace> <old> <new> [<old> <new> …]");
  process.exit(1);
}

let renamed = 0;
const missing: string[] = [];

for (const { locale } of localeRegistry) {
  const file = join(LOCALES, locale, `${namespace}.json`);
  if (!existsSync(file)) continue;
  const content = JSON.parse(readFileSync(file, "utf8")) as Node;
  let touched = false;

  for (let i = 0; i < pairs.length; i += 2) {
    const from = pairs[i] as string;
    const to = pairs[i + 1] as string;
    const value = getDeep(content, from);
    if (typeof value !== "string") {
      // English missing it is a mistake worth stopping for; a locale missing
      // it is the ordinary case of a key added since that locale was drafted.
      if (locale === "en") missing.push(`${namespace}.${from}`);
      continue;
    }
    setDeep(content, to, value);
    deleteDeep(content, from);
    touched = true;
    renamed += 1;

    const identical = content["$identical"];
    if (Array.isArray(identical)) {
      const index = identical.indexOf(from);
      if (index !== -1) {
        identical[index] = to;
        content["$identical"] = [...identical].sort();
      }
    }
  }

  if (touched) writeFileSync(file, `${JSON.stringify(content, null, 2)}\n`, "utf8");
}

if (missing.length > 0) {
  console.error("Not found in English:");
  for (const key of missing) console.error(`  ${key}`);
  process.exit(1);
}

console.log(`renamed ${renamed} key(s) across the locales that have them`);
