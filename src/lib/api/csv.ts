/**
 * Writing CSV, to RFC 4180.
 *
 * The site already has a reader for the keyword pipeline; this is the other
 * direction, for the data exports.
 *
 * Two decisions worth stating, because both look like waste until the file is
 * opened in something real:
 *
 * **Provenance is a column, not a preamble.** A comment block at the top of a
 * CSV is not part of the format — spreadsheets read it as a broken first row —
 * and a note in an HTTP header is invisible to anyone who has the file. So
 * every row carries where its value came from. Repeating a short string a few
 * hundred times costs a few kilobytes and means a row pasted into a document
 * still says what it is.
 *
 * **CRLF line endings.** The specification says so, and Excel on Windows still
 * cares. Every reader worth using accepts both.
 */

export type CsvValue = string | number | null | undefined;

/** One cell, quoted only when it has to be. */
export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function csvRow(values: readonly CsvValue[]): string {
  return values.map(csvCell).join(",");
}

/**
 * A complete CSV document.
 *
 * `columns` is the header row and the key order, so a caller cannot silently
 * emit rows whose columns do not match their header.
 */
export function toCsv<T extends Record<string, CsvValue>>(
  columns: readonly (keyof T & string)[],
  rows: readonly T[],
): string {
  const lines = [csvRow(columns), ...rows.map((row) => csvRow(columns.map((key) => row[key])))];
  return `${lines.join("\r\n")}\r\n`;
}

/** Headers for a downloadable CSV, named so a browser saves it sensibly. */
export function csvHeaders(filename: string, cacheControl: string): Record<string, string> {
  return {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="${filename}"`,
    "cache-control": cacheControl,
    // Data, not a page. `/api/` is the page that documents it.
    "x-robots-tag": "noindex",
  };
}
