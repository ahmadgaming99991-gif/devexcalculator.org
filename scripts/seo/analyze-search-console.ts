/**
 * Reading a Google Search Console export.
 *
 * Search Console is the only source of what people actually type into a search
 * box. This site was built from two competitor exports, which are a record of
 * what competitors rank for and not of demand — and sixty-three amount pages
 * have been held ever since, waiting for evidence this script exists to read.
 *
 * Three rules:
 *
 *   - **The export never enters the repository.** `private/` is git-ignored,
 *     and so is the report. A performance export is the owner's data about
 *     their own property, and committing it would publish a list of every
 *     query the site is seen for.
 *   - **The report proposes; it does not publish.** Nothing here writes a
 *     route, edits the registry or unblocks a held page. The publication gate
 *     in `docs/seo/indexation-policy.md` asks for more than volume, and the
 *     whole point of that gate is that a number cannot satisfy it alone.
 *   - **The output is deterministic.** Same export, byte-identical report. A
 *     report that reorders itself between runs cannot be diffed, and a diff is
 *     how you see what changed since last month.
 *
 * Usage:
 *
 *   1. In Search Console, open Performance → Search results.
 *   2. Set the date range, then Export → Download CSV. It arrives as a zip.
 *   3. Unzip it into `private/search-console/`. The files this reads are
 *      `Queries.csv` and, if present, `Pages.csv` — the names Search Console
 *      gives them.
 *   4. `npm run seo:search-console`
 *
 * A page-and-query export (Performance → filter by page, then export) gives
 * the cannibalisation and click-through findings; without it those sections
 * say so rather than being silently empty.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "../../src/lib/seo/csv";
import {
  LOW_CTR,
  MINIMUM_IMPRESSIONS,
  OPPORTUNITY_BAND,
  cannibalisation,
  lowClickThrough,
  parseCount,
  parseRate,
  positionOpportunities,
  toPath,
  unservedAmounts,
  type Finding,
  type PageQueryRow,
  type QueryRow,
} from "../../src/lib/seo/search-console";
import { REPO_ROOT } from "./paths";

const INPUT_DIR = join(REPO_ROOT, "private", "search-console");
const OUTPUT = join(INPUT_DIR, "report.md");

/** Column names Search Console uses, lowercased for matching. */
const COLUMNS = {
  query: ["top queries", "query", "queries"],
  page: ["top pages", "page", "pages", "landing page"],
  clicks: ["clicks"],
  impressions: ["impressions"],
  ctr: ["ctr", "click through rate"],
  position: ["position", "average position"],
} as const;

function columnIndex(headers: readonly string[], names: readonly string[]): number {
  const lower = headers.map((header) => header.trim().toLowerCase());
  for (const name of names) {
    const index = lower.indexOf(name);
    if (index !== -1) return index;
  }
  return -1;
}

function readRows(file: string): { headers: readonly string[]; rows: readonly (readonly string[])[] } {
  const parsed = parseCsv(readFileSync(file, "utf8"));
  return { headers: parsed.headers, rows: parsed.rows };
}

function readQueryFile(file: string): readonly QueryRow[] {
  const { headers, rows } = readRows(file);
  const q = columnIndex(headers, COLUMNS.query);
  if (q === -1) return [];

  const c = columnIndex(headers, COLUMNS.clicks);
  const i = columnIndex(headers, COLUMNS.impressions);
  const r = columnIndex(headers, COLUMNS.ctr);
  const p = columnIndex(headers, COLUMNS.position);

  return rows
    .map((row) => ({
      query: (row[q] ?? "").trim(),
      clicks: parseCount(row[c] ?? "0"),
      impressions: parseCount(row[i] ?? "0"),
      ctr: parseRate(row[r] ?? "0"),
      position: parseRate(row[p] ?? "0"),
    }))
    .filter((row) => row.query !== "");
}

function readPageQueryFile(file: string): readonly PageQueryRow[] {
  const { headers, rows } = readRows(file);
  const q = columnIndex(headers, COLUMNS.query);
  const pg = columnIndex(headers, COLUMNS.page);
  if (q === -1 || pg === -1) return [];

  const c = columnIndex(headers, COLUMNS.clicks);
  const i = columnIndex(headers, COLUMNS.impressions);
  const r = columnIndex(headers, COLUMNS.ctr);
  const p = columnIndex(headers, COLUMNS.position);

  return rows
    .map((row) => ({
      query: (row[q] ?? "").trim(),
      page: toPath(row[pg] ?? ""),
      clicks: parseCount(row[c] ?? "0"),
      impressions: parseCount(row[i] ?? "0"),
      ctr: parseRate(row[r] ?? "0"),
      position: parseRate(row[p] ?? "0"),
    }))
    .filter((row) => row.query !== "" && row.page !== "");
}

function section(title: string, note: string, findings: readonly Finding[]): string {
  const lines = [`## ${title}`, "", note, ""];

  if (findings.length === 0) {
    lines.push("Nothing met the threshold in this export.", "");
    return lines.join("\n");
  }

  lines.push("| Subject | Detail | Impressions |", "| --- | --- | --- |");
  for (const finding of findings.slice(0, 40)) {
    lines.push(
      `| ${escapeCell(finding.subject)} | ${escapeCell(finding.detail)} | ${finding.impressions.toLocaleString("en-US")} |`,
    );
  }
  if (findings.length > 40) {
    lines.push("", `${findings.length - 40} further findings not listed.`);
  }
  lines.push("");
  return lines.join("\n");
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function main(): void {
  if (!existsSync(INPUT_DIR)) {
    mkdirSync(INPUT_DIR, { recursive: true });
    console.log(
      `Created ${relativeToRepo(INPUT_DIR)}.\n\n` +
        `Export Performance → Search results from Search Console, unzip it there,\n` +
        `and run this again. Nothing in that directory is ever committed.`,
    );
    return;
  }

  const files = readdirSync(INPUT_DIR).filter((name) => name.toLowerCase().endsWith(".csv"));
  if (files.length === 0) {
    console.log(
      `No CSV files in ${relativeToRepo(INPUT_DIR)} — nothing to analyse. This is not a failure.`,
    );
    return;
  }

  const queryOnlyRows: QueryRow[] = [];
  const pageQueryRows: PageQueryRow[] = [];

  for (const name of files) {
    const file = join(INPUT_DIR, name);
    const withPages = readPageQueryFile(file);
    if (withPages.length > 0) {
      pageQueryRows.push(...withPages);
      continue;
    }
    queryOnlyRows.push(...readQueryFile(file));
  }

  /*
   * The two exports describe the same impressions from different angles, so
   * they must never be concatenated: doing that listed "robux to usd" three
   * times — once from Queries.csv and once per page it ranks on — and counted
   * its impressions twice over. The query-level export is authoritative where
   * it exists; the page export is folded down into one row per query only when
   * it does not.
   */
  const queryRows: readonly QueryRow[] =
    queryOnlyRows.length > 0 ? queryOnlyRows : foldToQueries(pageQueryRows);

  if (queryRows.length === 0) {
    console.error(
      `Read ${files.length} file(s) but found no recognisable query column.\n` +
        `Expected a Search Console export with a "Top queries" or "Query" column.`,
    );
    process.exit(1);
  }

  const report = [
    "# Search Console findings",
    "",
    `Generated from ${files.length} file(s) in \`private/search-console/\`, covering ` +
      `${queryRows.length.toLocaleString("en-US")} rows` +
      (pageQueryRows.length > 0
        ? `, ${pageQueryRows.length.toLocaleString("en-US")} of them with a page attached.`
        : ". No page-and-query export was present, so the click-through and cannibalisation sections are empty."),
    "",
    "**Every finding here is a proposal.** Nothing in this report publishes a page, ",
    "edits the route registry or unblocks a held amount. The publication gate in ",
    "`docs/seo/indexation-policy.md` asks for distinct search behaviour, unique worked ",
    "examples and an intent no existing route already serves — none of which a volume ",
    "figure can answer.",
    "",
    `Thresholds: at least ${MINIMUM_IMPRESSIONS} impressions to appear at all; ` +
      `positions ${OPPORTUNITY_BAND.from}–${OPPORTUNITY_BAND.to} count as movable; ` +
      `click-through below ${(LOW_CTR * 100).toFixed(0)}% counts as low.`,
    "",
    section(
      "Positions worth moving",
      "Ranking in the band where the page is already understood to be relevant and is not being clicked. Above the band the work is content; below it, a title rewrite is not what is wrong.",
      positionOpportunities(queryRows),
    ),
    section(
      "Shown often, clicked rarely",
      "Usually a title or a description problem rather than a content one. Read the page's actual snippet before changing anything.",
      lowClickThrough(pageQueryRows),
    ),
    section(
      "Queries answered by more than one page",
      "Sometimes cannibalisation, sometimes two genuine intents sharing a phrase. Only reading both pages tells you which, so nothing here is acted on automatically.",
      cannibalisation(pageQueryRows),
    ),
    section(
      "Amount queries with no page",
      "The evidence the held amount pages have been waiting for. Demand existing is the first of the gate's criteria, not the whole of it.",
      unservedAmounts(queryRows),
    ),
  ].join("\n");

  writeFileSync(OUTPUT, `${report.trimEnd()}\n`, "utf8");
  console.log(`Wrote ${relativeToRepo(OUTPUT)}.`);
  console.log("It is git-ignored, like the export it came from.");
}

/**
 * One row per query, from rows split across pages.
 *
 * Position is weighted by impressions rather than averaged: a query shown four
 * thousand times at position 8 and forty times at position 30 is a position-8
 * query, and a plain mean would call it 19.
 */
function foldToQueries(rows: readonly PageQueryRow[]): readonly QueryRow[] {
  const byQuery = new Map<string, { clicks: number; impressions: number; weighted: number }>();

  for (const row of rows) {
    const existing = byQuery.get(row.query) ?? { clicks: 0, impressions: 0, weighted: 0 };
    byQuery.set(row.query, {
      clicks: existing.clicks + row.clicks,
      impressions: existing.impressions + row.impressions,
      weighted: existing.weighted + row.position * row.impressions,
    });
  }

  return [...byQuery.entries()].map(([query, totals]) => ({
    query,
    clicks: totals.clicks,
    impressions: totals.impressions,
    ctr: totals.impressions === 0 ? 0 : totals.clicks / totals.impressions,
    position: totals.impressions === 0 ? 0 : totals.weighted / totals.impressions,
  }));
}

function relativeToRepo(path: string): string {
  return path.slice(REPO_ROOT.length + 1).replace(/\\/g, "/");
}

main();
