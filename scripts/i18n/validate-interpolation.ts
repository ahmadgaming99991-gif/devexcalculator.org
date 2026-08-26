/**
 * Every `{token}` a sentence declares is a value its call site passes.
 *
 * `interpolate` leaves an unknown token exactly as written, on purpose: a
 * visible `{amount}` is a bug report, and the word "undefined" in a payout
 * sentence is a wrong figure that reads perfectly. But nothing was checking
 * for the bug report, so one shipped — `/platform/` told readers that
 * "Platform totals keep every one of them for {retention} days", because the
 * string said `{retention}` and the call site passed `retentionDays`.
 *
 * The dictionary validator could not have caught it. It compares English
 * against its translations, and all seven agreed: they all said `{retention}`.
 * The disagreement was between the dictionary and the code, which is a
 * different pair, and this is the check for that pair.
 *
 * Both directions matter:
 *
 *   **declared, never passed** — the reader sees the brace and the word.
 *   **passed, never declared** — harmless to render and a reliable sign the
 *   sentence was rewritten while the call site was not, which usually means a
 *   number the reader is meant to see is no longer in the sentence at all.
 *
 * Only literal keys with an object argument written inline can be read from
 * source, which is the shape almost every call uses. A key assembled at
 * runtime is skipped and counted, so the number of unchecked calls is visible
 * rather than silently zero.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DICTIONARY_NAMESPACES } from "../../src/i18n/types";
import { DEFAULT_LOCALE } from "../../src/i18n/config";

const ROOT = process.cwd();
const LOCALES = join(ROOT, "src/i18n/locales", DEFAULT_LOCALE);

/** Every English string, by its fully qualified dotted key. */
function englishStrings(): Map<string, string> {
  const out = new Map<string, string>();

  const visit = (value: unknown, path: string): void => {
    if (typeof value === "string") {
      out.set(path, value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}.${index}`));
      return;
    }
    if (value !== null && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (key === "$comment" || key === "$identical") continue;
        visit(child, path === "" ? key : `${path}.${key}`);
      }
    }
  };

  for (const namespace of DICTIONARY_NAMESPACES) {
    const file = join(LOCALES, `${namespace}.json`);
    try {
      visit(JSON.parse(readFileSync(file, "utf8")), namespace);
    } catch {
      // A namespace with no English file is the dictionary validator's problem.
    }
  }
  return out;
}

function tokensIn(value: string): Set<string> {
  return new Set((value.match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g) ?? []).map((t) => t.slice(1, -1)));
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "locales") continue;
      sourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * The keys at the top level of an inline object literal.
 *
 * Counts braces so a nested object or a JSX expression inside a value cannot
 * end the argument early, and ignores anything after a `:` so a property whose
 * value mentions a colon-separated string is not read as another key.
 */
function argumentNames(source: string, from: number): string[] | null {
  let depth = 0;
  let index = from;
  let body = "";
  for (; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) break;
    }
    if (depth >= 1) body += character;
  }
  if (depth !== 0) return null;

  const names: string[] = [];
  let level = 0;
  let current = "";
  for (const character of body.slice(1)) {
    if ("{[(".includes(character)) level += 1;
    else if ("}])".includes(character)) level -= 1;
    if (character === "," && level === 0) {
      names.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  names.push(current);

  return names
    .map((part) => part.split(":")[0]?.trim() ?? "")
    .map((name) => name.replace(/^\.\.\..*/, ""))
    .filter((name) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name));
}

const english = englishStrings();
const files = sourceFiles(join(ROOT, "src"));

let checked = 0;
let skipped = 0;
let problems = 0;

console.log(`interpolation — ${english.size} English string(s), ${files.length} source file(s)\n`);

/**
 * Tokens filled by `rich` rather than by `t`.
 *
 * `rich(t("key", { date }), { sourceRegistry: <InlineLink…/> })` splits the
 * work: `t` fills the plain values and `rich` replaces the rest with elements.
 * Reading only the `t` argument would report every link on the site as an
 * unfilled token, which is how a check stops being read.
 */
function richNames(source: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const match of source.matchAll(/\brich\(\s*t\(\s*"([^"]+)"/g)) {
    const key = match[1];
    if (key === undefined) continue;

    // Walk out of the `t(...)` call to the object literal that follows it.
    let depth = 1;
    let index = match.index + match[0].length;
    for (; index < source.length; index += 1) {
      const character = source[index];
      if (character === "(") depth += 1;
      if (character === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    const brace = source.indexOf("{", index);
    if (brace === -1) continue;
    const names = argumentNames(source, brace);
    if (names === null) continue;
    const existing = out.get(key) ?? new Set<string>();
    for (const name of names) existing.add(name);
    out.set(key, existing);
  }
  return out;
}

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const label = file.slice(ROOT.length + 1).replace(/\\/g, "/");
  const byRich = richNames(source);

  for (const match of source.matchAll(/\bt\(\s*"([^"]+)"\s*,\s*(?=\{)/g)) {
    const key = match[1];
    if (key === undefined) continue;

    const declared = english.get(key);
    if (declared === undefined) {
      // A key the English dictionary does not have. `t` throws for it at render
      // time and the coverage validator reports it; not this check's business.
      continue;
    }

    const passed = argumentNames(source, match.index + match[0].length);
    if (passed === null) {
      skipped += 1;
      continue;
    }

    checked += 1;
    const wanted = tokensIn(declared);
    const given = new Set([...passed, ...(byRich.get(key) ?? [])]);

    const unfilled = [...wanted].filter((token) => !given.has(token));
    const unused = [...given].filter((token) => !wanted.has(token));

    if (unfilled.length === 0 && unused.length === 0) continue;

    problems += 1;
    const line = source.slice(0, match.index).split("\n").length;
    console.log(`  ${label}:${line}  ${key}`);
    for (const token of unfilled) {
      console.log(`      declares {${token}} and is passed no such value — readers see the braces`);
    }
    for (const token of unused) {
      console.log(`      is passed "${token}", which the sentence does not use`);
    }
  }
}

console.log(`\n  ${checked} call(s) checked, ${skipped} not readable from source`);

if (problems > 0) {
  console.error(`\n${problems} interpolation mismatch(es).`);
  process.exit(1);
}
console.log("\nInterpolation matches every sentence.");
