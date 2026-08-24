/**
 * Puts the interpolated sentences back together in the dictionaries.
 *
 * Run by `npm run i18n:extract-templates`, after `i18n:hardcoded`.
 *
 * The first extraction split every sentence at its interpolation and kept the
 * pieces:
 *
 *     Last reviewed {formatDate(record.lastReviewedAt)}.
 *       ->  "Last reviewed"
 *
 * which is not a shorter sentence but a different one, and an unbuildable one:
 * German and Turkish put that date where English does not, so a translator
 * handed the fragment cannot produce a correct sentence and a renderer
 * concatenating in source order cannot either. The inventory now records these
 * as templates with named tokens, and this replaces the fragments with them.
 *
 * **A fragment is replaced, not appended.** The pieces of a sentence are
 * already keys, in the right section, in the right order. Adding the template
 * alongside them would leave the page's own words in the dictionary twice and
 * let a translator improve the half nobody renders. So the fragments are
 * located by value, the first of them takes the template, and the rest are
 * deleted — `i18n:prune` then drops them from the six locales.
 *
 * Which keys changed is not written down here. `validate:i18n` already
 * compares the tokens in each translation against the English, so every
 * locale still holding a fragment is named by the gate that fails the build —
 * a list this script wrote would only be a second, staler copy of that.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PLACEMENT, sectionKeyFor } from "./placement";

const ROOT = process.cwd();
const LOCALES = join(ROOT, "src/i18n/locales/en");
const TOKEN = /\{[a-zA-Z_][a-zA-Z0-9_]*\}/g;

interface Finding {
  readonly file: string;
  readonly line: number;
  readonly words: number;
  readonly text: string;
}

const report = JSON.parse(
  readFileSync(join(ROOT, "docs/i18n/hardcoded-remaining.json"), "utf8"),
) as { readonly hardcoded: readonly Finding[] };

/** Identical to the detector's, so the two can never disagree about a match. */
function normalise(value: string): string {
  return value
    .replace(/&rsquo;|&#8217;|[‘’ʼ]/g, "'")
    .replace(/&ldquo;|&rdquo;|[“”]/g, '"')
    .replace(/&mdash;|—/g, "-")
    .replace(/&ndash;|–/g, "-")
    .replace(/&hellip;|…/g, "...")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** The prose either side of each token, with the empty ends dropped. */
function fragments(template: string): string[] {
  return template
    .split(TOKEN)
    .map((part) => part.trim().replace(/^[.,;:!?]+/, "").trim())
    .filter((part) => part.length > 0);
}

type Node = Record<string, unknown>;

function getDeep(root: Node, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>((node, key) => {
    if (node === null || typeof node !== "object") return undefined;
    return (node as Node)[key];
  }, root);
}

function setDeep(root: Node, dotted: string, value: string): void {
  const parts = dotted.split(".");
  let node = root;
  for (const key of parts.slice(0, -1)) {
    const next = node[key];
    node = (typeof next === "object" && next !== null ? next : (node[key] = {})) as Node;
  }
  node[parts[parts.length - 1] as string] = value;
}

function deleteDeep(root: Node, dotted: string): void {
  const parts = dotted.split(".");
  let node: Node | undefined = root;
  for (const key of parts.slice(0, -1)) {
    const next: unknown = node?.[key];
    node = typeof next === "object" && next !== null ? (next as Node) : undefined;
    if (!node) return;
  }
  delete node[parts[parts.length - 1] as string];
}

/** Every leaf under a subtree, as `dotted.key` -> value. */
function leaves(node: unknown, prefix: string, into: Map<string, string>): void {
  if (typeof node === "string") {
    into.set(prefix, node);
    return;
  }
  if (node === null || typeof node !== "object" || Array.isArray(node)) return;
  for (const [key, value] of Object.entries(node as Node)) {
    if (key.startsWith("$")) continue;
    leaves(value, prefix === "" ? key : `${prefix}.${key}`, into);
  }
}

const dictionaries = new Map<string, Node>();
function dictionary(namespace: string): Node {
  const existing = dictionaries.get(namespace);
  if (existing) return existing;
  const loaded = JSON.parse(readFileSync(join(LOCALES, `${namespace}.json`), "utf8")) as Node;
  dictionaries.set(namespace, loaded);
  return loaded;
}

/*
 * A fresh matcher per call. `TOKEN` carries the `g` flag because `split`
 * needs it, and a global regex remembers where it stopped — so `test` inside a
 * filter answers true, false, true, false down the list and quietly drops half
 * the sentences.
 */
const templates = report.hardcoded.filter((finding) => hasToken(finding.text));

function hasToken(value: string): boolean {
  return new RegExp(TOKEN.source).test(value);
}

let replaced = 0;
let appended = 0;
let removed = 0;
const unplaced: string[] = [];

for (const finding of [...templates].sort(
  (a, b) => a.file.localeCompare(b.file) || a.line - b.line,
)) {
  const placement = PLACEMENT[finding.file];
  if (!placement) {
    unplaced.push(finding.file);
    continue;
  }
  const [namespace, prefix] = placement;
  const target = dictionary(namespace);
  const section = sectionKeyFor(join(ROOT, finding.file), finding.line);
  const base = `${prefix}.${section}`;

  const inSection = new Map<string, string>();
  leaves(getDeep(target, base), base, inSection);

  const wanted = new Set(fragments(finding.text).map(normalise));
  const matches = [...inSection.entries()]
    .filter(([, value]) => wanted.has(normalise(value)))
    .map(([key]) => key)
    .sort();

  if (matches.length > 0) {
    const primary = matches[0] as string;
    setDeep(target, primary, finding.text);
    replaced += 1;
    for (const extra of matches.slice(1)) {
      deleteDeep(target, extra);
      removed += 1;
    }
  } else {
    /*
     * No fragment of this sentence became a key — every piece of it was below
     * the inventory's prose threshold on its own, which is exactly what a
     * sentence that is mostly a number looks like. It still needs a key.
     */
    const used = [...inSection.keys()]
      .map((key) => /\.p(\d+)$/.exec(key)?.[1])
      .filter((n): n is string => n !== undefined)
      .map(Number);
    const next = used.length > 0 ? Math.max(...used) + 1 : 1;
    const key = `${base}.p${next}`;
    setDeep(target, key, finding.text);
    appended += 1;
  }
}

if (unplaced.length > 0) {
  console.error("No placement declared for:");
  for (const file of [...new Set(unplaced)].sort()) console.error(`  ${file}`);
  process.exit(1);
}

for (const [namespace, content] of dictionaries) {
  writeFileSync(join(LOCALES, `${namespace}.json`), `${JSON.stringify(content, null, 2)}\n`, "utf8");
}


console.log(`interpolated sentences: ${templates.length}`);
console.log(`  fragments replaced  ${replaced}`);
console.log(`  new keys appended   ${appended}`);
console.log(`  stale keys removed  ${removed}`);
