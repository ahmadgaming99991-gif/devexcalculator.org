# Dataset report

## Source files

Preserved byte-identical in `seo/source/`. `.gitattributes` marks them `-text`
so line endings are never normalised and the recorded hashes stay verifiable.

| | RBXTax export | RoMonitor export |
|---|---|---|
| Filename | `rbxtax.com-devex.html-organic-keywords-path_2026-08-17_14-15-54.csv` | `romonitorstats.com-devex-calculator-organic_2026-08-17_14-15-10.csv` |
| Bytes | 4,898 | 21,801 |
| SHA-256 | `510A080DD7845E2B367317DE20CB26BC23921D26622A1DC27DA37A07ADB9A90B` | `1A794DA07900A1F8EAA7EEAD84F3DA82D4DDE298D8F6D39200F553EFBAF16750` |
| Encoding | UTF-8, no BOM | UTF-8, no BOM |
| Delimiter | `,` | `,` |
| Data rows | 82 | 362 |
| Summed volume | 14,270 | 81,220 |
| Summed organic traffic | 1,564 | 13,534 |

## Checkpoint reconciliation

The specification records expected values. Both files match **exactly**,
recomputed from the files rather than asserted:

| | Expected | Recomputed | |
|---|---:|---:|---|
| RBXTax rows | ~82 | 82 | match |
| RBXTax volume | ~14,270 | 14,270 | match |
| RBXTax traffic | ~1,564 | 1,564 | match |
| RoMonitor rows | ~362 | 362 | match |
| RoMonitor volume | ~81,220 | 81,220 | match |
| RoMonitor traffic | ~13,534 | 13,534 | match |

A mismatch is treated as an anomaly to investigate, not a number to force. The
pipeline reports it and CI fails.

## Columns

All ten expected headers are present in both files and map cleanly:

`Keyword` · `Volume` · `Organic traffic` · `Paid traffic` · `Average position` ·
`Locations` · `Top location` · `Top location code` · `Top location's volume` ·
`Top location's traffic`

No column is missing and no header is unmapped. A missing column would be
reported rather than silently producing empty values.

## Parsing

The CSV reader is hand-written (`src/lib/seo/csv.ts`) rather than taken from a
package, because two quirks in these files matter and both are easy to get wrong
silently:

**Quoted fields containing commas.** Rows such as `"100,000 robux to usd",150`
appear in both exports. A `split(",")` turns that one row into two, corrupting
the row accounting the specification requires. There are 11 such rows.

**UTF-8 BOM.** Neither supplied file has one, but keyword exports routinely do,
and a BOM on the first header cell makes `Keyword` fail to match — dropping
every keyword while appearing to parse successfully.

Both are covered by tests in `tests/unit/seo/csv.test.ts`, along with escaped
quotes, CRLF endings, newlines inside quoted fields, and a final record with no
trailing newline.

Metric cells parse to numbers; a blank cell means no data and becomes 0, while a
non-numeric cell throws rather than being silently treated as zero.

## Duplicates across files

63 rows are the same normalised keyword appearing in both exports.

The canonical row is the one with the **highest volume**, then the higher organic
traffic, then file order as a stable tie-break. This was a defect in the first
implementation, which kept whichever row was read first: `robux to usd` appears
at volume 30 in one file and 16,470 in the other, and alphabetical filename
ordering was discarding the stronger signal entirely — the largest term in the
dataset appeared to belong to no route.

Non-canonical rows are retained as `duplicate-variant` with a note recording
which row superseded them and why. Nothing is deleted.

## Normalisation

Each row keeps its raw keyword, source file and source row number alongside
every derived field, so any grouping decision can be audited back to the exact
source cell.

Derived: Unicode-normalised keyword, lowercase comparison key, spelling-family
key, extracted Robux amount and amount entity id, currency token, entity list,
primary and secondary intent, target route, fallback route, priority band and
both scores.

**Amount extraction** requires the number to sit next to a Robux word, so
`devex rates 2023` is not read as an amount. Formatting variants — `100000`,
`100,000`, `100 000`, `100k` — resolve to one entity id, `robux-100000`. Scale
words (`k`, `m`, `b`, `mil`, `million`, `billion`, `trillion`) are handled, and a
fractional result such as `2.5 robux` is rejected.

## Provenance

These metrics are third-party estimates describing two competitor domains'
organic performance. They indicate relative demand and nothing more. Nothing on
the public site cites them, and no figure here is presented as traffic this site
will receive.
