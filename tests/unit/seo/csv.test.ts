import { describe, expect, it } from "vitest";
import {
  CsvParseError,
  KEYWORD_EXPORT_COLUMNS,
  mapColumns,
  parseCsv,
  parseMetric,
} from "@/lib/seo/csv";

describe("parseCsv", () => {
  it("parses a simple file", () => {
    const result = parseCsv("a,b\n1,2\n3,4\n");
    expect(result.headers).toEqual(["a", "b"]);
    expect(result.rows).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("strips a UTF-8 BOM from the first header", () => {
    const result = parseCsv("﻿Keyword,Volume\nrobux,10\n");
    expect(result.hadBom).toBe(true);
    expect(result.headers[0]).toBe("Keyword");
  });

  it("keeps a quoted field containing a comma as one field", () => {
    // This is the row shape that breaks a naive split(",").
    const result = parseCsv('Keyword,Volume\n"100,000 robux to usd",150\n');
    expect(result.rows[0]).toEqual(["100,000 robux to usd", "150"]);
  });

  it("handles escaped double quotes inside a quoted field", () => {
    const result = parseCsv('a\n"he said ""hi"""\n');
    expect(result.rows[0]).toEqual(['he said "hi"']);
  });

  it("handles CRLF line endings", () => {
    const result = parseCsv("a,b\r\n1,2\r\n");
    expect(result.rows).toEqual([["1", "2"]]);
  });

  it("keeps a newline that appears inside a quoted field", () => {
    const result = parseCsv('a,b\n"line1\nline2",2\n');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.[0]).toBe("line1\nline2");
  });

  it("flushes a final record with no trailing newline", () => {
    const result = parseCsv("a,b\n1,2");
    expect(result.rows).toEqual([["1", "2"]]);
  });

  it("preserves empty fields rather than dropping them", () => {
    const result = parseCsv("a,b,c\n1,,3\n");
    expect(result.rows[0]).toEqual(["1", "", "3"]);
  });

  it("throws on a file that ends inside a quoted field", () => {
    expect(() => parseCsv('a\n"unterminated\n')).toThrow(CsvParseError);
  });

  it("throws on a header-only empty input", () => {
    expect(() => parseCsv("")).toThrow(CsvParseError);
  });
});

describe("mapColumns", () => {
  const header =
    "Keyword,Volume,Organic traffic,Paid traffic,Average position,Locations,Top location,Top location code,Top location's volume,Top location's traffic";

  it("maps the supplied export headers onto logical names", () => {
    const parsed = parseCsv(`${header}\nrobux to usd,16470,3937,0,1.70,30,United States,US,14000,3365\n`);
    const mapped = mapColumns(parsed, KEYWORD_EXPORT_COLUMNS);

    expect(mapped.missingColumns).toEqual([]);
    expect(mapped.unmappedHeaders).toEqual([]);
    expect(mapped.rows[0]?.values.keyword).toBe("robux to usd");
    expect(mapped.rows[0]?.values.volume).toBe("16470");
    expect(mapped.rows[0]?.values.topLocationCode).toBe("US");
  });

  it("numbers rows from 1 so they match a spreadsheet view", () => {
    const parsed = parseCsv(`${header}\na,1,1,0,1,1,US,US,1,1\nb,2,2,0,1,1,US,US,2,2\n`);
    const mapped = mapColumns(parsed, KEYWORD_EXPORT_COLUMNS);
    expect(mapped.rows.map((r) => r.sourceRow)).toEqual([1, 2]);
  });

  it("reports a missing column rather than silently emitting blanks", () => {
    const parsed = parseCsv("Keyword,Volume\nrobux,10\n");
    const mapped = mapColumns(parsed, KEYWORD_EXPORT_COLUMNS);
    expect(mapped.missingColumns).toContain("organicTraffic");
    expect(mapped.missingColumns).toContain("topLocation");
  });

  it("reports headers it could not map", () => {
    const parsed = parseCsv("Keyword,Volume,Something Else\nrobux,10,x\n");
    const mapped = mapColumns(parsed, KEYWORD_EXPORT_COLUMNS);
    expect(mapped.unmappedHeaders).toContain("Something Else");
  });

  it("matches header aliases case-insensitively", () => {
    const parsed = parseCsv("keyword,volume\nrobux,10\n");
    const mapped = mapColumns(parsed, KEYWORD_EXPORT_COLUMNS);
    expect(mapped.rows[0]?.values.keyword).toBe("robux");
  });
});

describe("parseMetric", () => {
  it("parses plain and grouped numbers", () => {
    expect(parseMetric("16470")).toBe(16470);
    expect(parseMetric("16,470")).toBe(16470);
    expect(parseMetric("1.70")).toBe(1.7);
  });

  it("treats a blank cell as no data", () => {
    expect(parseMetric("")).toBe(0);
    expect(parseMetric("   ")).toBe(0);
  });

  it("throws on a non-numeric cell rather than assuming zero", () => {
    expect(() => parseMetric("n/a")).toThrow(RangeError);
    expect(() => parseMetric("abc")).toThrow(RangeError);
  });
});
