/**
 * RFC 4180 CSV reader for the supplied keyword exports.
 *
 * Written by hand rather than pulled from a package because the exports have
 * exactly two quirks that matter and both are easy to get wrong silently:
 * a UTF-8 BOM on the first header cell, and quoted keywords that contain
 * commas (`"100,000 robux to usd"`). A naive `split(",")` turns that one row
 * into two and quietly corrupts the row accounting the specification requires.
 */

export interface CsvParseResult {
  readonly headers: readonly string[];
  /** One entry per data row, in file order. */
  readonly rows: readonly (readonly string[])[];
  readonly hadBom: boolean;
  readonly delimiter: string;
}

export class CsvParseError extends Error {
  constructor(
    message: string,
    readonly line: number,
  ) {
    super(`CSV parse error on line ${line}: ${message}`);
    this.name = "CsvParseError";
  }
}

const BOM = "﻿";

/** Parses CSV text into headers plus rows, preserving field order exactly. */
export function parseCsv(input: string, delimiter = ","): CsvParseResult {
  const hadBom = input.startsWith(BOM);
  const text = hadBom ? input.slice(BOM.length) : input;

  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let line = 1;
  let sawAnyCharacter = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === "\n") line += 1;
        field += char;
      }
      continue;
    }

    if (char === '"') {
      if (field !== "") {
        throw new CsvParseError("unexpected quote in the middle of a field", line);
      }
      inQuotes = true;
      sawAnyCharacter = true;
      continue;
    }

    if (char === delimiter) {
      record.push(field);
      field = "";
      sawAnyCharacter = true;
      continue;
    }

    if (char === "\r") {
      // Swallow CR; the following LF terminates the record.
      continue;
    }

    if (char === "\n") {
      record.push(field);
      records.push(record);
      field = "";
      record = [];
      line += 1;
      sawAnyCharacter = false;
      continue;
    }

    field += char;
    sawAnyCharacter = true;
  }

  if (inQuotes) {
    throw new CsvParseError("file ended inside a quoted field", line);
  }
  // Flush a trailing record that has no newline after it.
  if (sawAnyCharacter || field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  const [headerRecord, ...dataRecords] = records;
  if (!headerRecord) {
    throw new CsvParseError("file contains no header row", 1);
  }

  return {
    headers: headerRecord.map((h) => h.trim()),
    rows: dataRecords,
    hadBom,
    delimiter,
  };
}

/**
 * Maps a parsed CSV onto named columns.
 *
 * A missing expected column is reported rather than silently producing empty
 * values, because the specification treats a changed export as something to
 * investigate rather than absorb.
 */
export interface ColumnMapping {
  readonly [logicalName: string]: readonly string[];
}

/** Header aliases for the supplied exports. */
export const KEYWORD_EXPORT_COLUMNS: ColumnMapping = {
  keyword: ["Keyword", "keyword"],
  volume: ["Volume", "Search Volume", "volume"],
  organicTraffic: ["Organic traffic", "Traffic", "organic traffic"],
  paidTraffic: ["Paid traffic", "paid traffic"],
  averagePosition: ["Average position", "Position", "average position"],
  locations: ["Locations", "locations"],
  topLocation: ["Top location", "top location"],
  topLocationCode: ["Top location code", "top location code"],
  topLocationVolume: ["Top location's volume", "Top location volume"],
  topLocationTraffic: ["Top location's traffic", "Top location traffic"],
};

export interface MappedRow {
  /** 1-based row number within the data section, matching a spreadsheet view. */
  readonly sourceRow: number;
  readonly values: Readonly<Record<string, string>>;
}

export interface MappingResult {
  readonly rows: readonly MappedRow[];
  readonly resolvedColumns: Readonly<Record<string, number>>;
  readonly missingColumns: readonly string[];
  readonly unmappedHeaders: readonly string[];
}

export function mapColumns(
  parsed: CsvParseResult,
  mapping: ColumnMapping = KEYWORD_EXPORT_COLUMNS,
): MappingResult {
  const resolved: Record<string, number> = {};
  const missing: string[] = [];
  const usedIndexes = new Set<number>();

  for (const [logical, aliases] of Object.entries(mapping)) {
    const index = parsed.headers.findIndex((header) =>
      aliases.some((alias) => alias.toLowerCase() === header.toLowerCase()),
    );
    if (index === -1) {
      missing.push(logical);
    } else {
      resolved[logical] = index;
      usedIndexes.add(index);
    }
  }

  const rows = parsed.rows.map((row, i) => {
    const values: Record<string, string> = {};
    for (const [logical, index] of Object.entries(resolved)) {
      values[logical] = row[index] ?? "";
    }
    return { sourceRow: i + 1, values };
  });

  return {
    rows,
    resolvedColumns: resolved,
    missingColumns: missing,
    unmappedHeaders: parsed.headers.filter((_, i) => !usedIndexes.has(i)),
  };
}

/**
 * Parses a metric cell to a number.
 * Blank cells mean "no data" and become 0; a non-numeric cell is an error the
 * caller should surface rather than treat as zero.
 */
export function parseMetric(value: string): number {
  const cleaned = value.trim().replace(/,/g, "");
  if (cleaned === "") return 0;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) {
    throw new RangeError(`Metric cell is not numeric: ${JSON.stringify(value)}`);
  }
  return parsed;
}
