/**
 * Reading a locale's catalogs the way an auditor has to read them.
 *
 * Deliberately not `JSON.parse` alone. A JSON object cannot hold two entries
 * with the same name, so a duplicated key is silently resolved by the parser —
 * last one wins — and both the file and the parsed object look fine while one
 * of the two translations is unreachable. Finding that needs the raw text.
 *
 * Everything here is pure and takes a directory, so the audit can be pointed at
 * a fixture as easily as at `src/i18n/locales`.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface CatalogEntry {
  /** `rates.devexRates.body.p1` — namespace first, then the path inside it. */
  readonly key: string;
  readonly value: string;
  readonly namespace: string;
  readonly file: string;
}

export interface DuplicateKey {
  readonly namespace: string;
  readonly file: string;
  /** The object path the duplicate sits at, as far as the scan can tell. */
  readonly key: string;
  readonly occurrences: number;
}

export interface Catalog {
  readonly locale: string;
  readonly entries: ReadonlyMap<string, CatalogEntry>;
  readonly duplicates: readonly DuplicateKey[];
  /** Keys the translator declared as legitimately identical to English. */
  readonly declaredIdentical: ReadonlySet<string>;
  readonly namespaces: readonly string[];
}

/** Flattens nested objects and arrays into dotted paths. Arrays index numerically. */
function flatten(
  value: unknown,
  path: string,
  namespace: string,
  file: string,
  out: Map<string, CatalogEntry>,
): void {
  if (typeof value === "string") {
    out.set(path, { key: path, value, namespace, file });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${path}.${index}`, namespace, file, out));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [name, child] of Object.entries(value)) {
      // Metadata for translators and validators. Never rendered.
      if (name === "$comment" || name === "$identical") continue;
      flatten(child, path === "" ? name : `${path}.${name}`, namespace, file, out);
    }
  }
}

/**
 * Duplicate keys, found in the raw text rather than the parsed object.
 *
 * Tracks brace and bracket depth so a key repeated under two different parents
 * is not reported, and skips over string contents so a `{` inside a sentence
 * cannot shift the depth. It reports the leaf name and its depth rather than a
 * full path — enough to find it, and honest about being a text scan rather
 * than a parse.
 */
function findDuplicates(raw: string, namespace: string, file: string): DuplicateKey[] {
  const seen = new Map<string, number>();
  const stack: string[] = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let current = "";
  let pendingKey: string | null = null;

  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index] as string;

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
        // A string followed by a colon is a key; anything else is a value.
        let lookahead = index + 1;
        while (lookahead < raw.length && /\s/.test(raw[lookahead] as string)) lookahead += 1;
        pendingKey = raw[lookahead] === ":" ? current : null;
        if (pendingKey !== null) {
          const scoped = `${stack.join(".")}|${depth}|${pendingKey}`;
          seen.set(scoped, (seen.get(scoped) ?? 0) + 1);
        }
        current = "";
      } else {
        current += character;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      current = "";
      continue;
    }
    if (character === "{" || character === "[") {
      depth += 1;
      stack.push(pendingKey ?? String(depth));
      pendingKey = null;
      continue;
    }
    if (character === "}" || character === "]") {
      depth -= 1;
      stack.pop();
      continue;
    }
  }

  const duplicates: DuplicateKey[] = [];
  for (const [scoped, count] of seen) {
    if (count < 2) continue;
    const parts = scoped.split("|");
    duplicates.push({
      namespace,
      file,
      key: `${parts[0] === "" ? "" : `${parts[0]}.`}${parts[2] ?? ""}`,
      occurrences: count,
    });
  }
  return duplicates;
}

export function loadCatalog(localesDir: string, locale: string): Catalog {
  const dir = join(localesDir, locale);
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort();

  const entries = new Map<string, CatalogEntry>();
  const duplicates: DuplicateKey[] = [];
  const declaredIdentical = new Set<string>();
  const namespaces: string[] = [];

  for (const file of files) {
    const namespace = file.replace(/\.json$/, "");
    namespaces.push(namespace);

    const full = join(dir, file);
    const raw = readFileSync(full, "utf8");
    duplicates.push(...findDuplicates(raw, namespace, file));

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const identical = parsed.$identical;
    if (Array.isArray(identical)) {
      for (const key of identical) {
        if (typeof key === "string") declaredIdentical.add(`${namespace}.${key}`);
      }
    }
    flatten(parsed, namespace, namespace, file, entries);
  }

  return { locale, entries, duplicates, declaredIdentical, namespaces };
}

export function localeDirectories(localesDir: string): string[] {
  return readdirSync(localesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}
