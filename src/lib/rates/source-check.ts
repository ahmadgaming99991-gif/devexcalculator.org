import type { HistoryStore } from "../platform/history";

/**
 * Checking the published rate against Roblox's own document, on a schedule.
 *
 * The footer has always carried a verification date, and it has always been a
 * fact about the past: the day a person read Roblox's documentation and
 * confirmed every figure in the registry. That date must not advance on its
 * own — a footer printing today beside the word "verified" would be claiming a
 * check nobody performed, and that is the one thing this site refuses to do.
 *
 * But "nobody checked today" was never the goal; it was only the truth. So
 * this makes the check itself real and automatic, and then the date it
 * produces can move every day honestly.
 *
 * Roblox publishes the DevEx page as markdown alongside the HTML — the page
 * itself links to it — and the markdown carries a `last_updated` field, which
 * is Roblox's own statement of when the page last changed. Thirteen kilobytes,
 * no rendering, no scraping of a layout that will be redesigned. That document
 * is what is read here.
 *
 * Three rules hold this to something worth showing a reader:
 *
 *   1. **It may confirm; it may never rewrite.** A figure that has changed
 *      raises `changed` and stops. Nothing here edits the registry, because a
 *      rate is not a number to be copied — it needs a person to read what
 *      changed, what it applies to and from when.
 *   2. **A document it cannot recognise is not a change.** An outage, a
 *      challenge page or a redesign returns `unreadable`, which is reported as
 *      what it is. Treating a missing figure as a removed figure would turn
 *      every upstream hiccup into a false alarm.
 *   3. **The comparison is not done here.** This records only what the
 *      document said. The registry side compares — so a registry edit
 *      re-evaluates the stored observation immediately, and this module can
 *      run inside the Worker with no imports beyond a type.
 */

/** The markdown Roblox publishes beside the page, linked from the page. */
export const SOURCE_DOCUMENT_URL =
  "https://create.roblox.com/docs/en-us/production/monetization/developer-exchange.md";

/** The page a reader would open. What the site links to. */
export const SOURCE_PAGE_URL =
  "https://create.roblox.com/docs/production/monetization/developer-exchange";

/**
 * Four checks a day.
 *
 * The cron fires every fifteen minutes for the player-count collector, which
 * would be ninety-six requests a day at a document that changes a few times a
 * year. Six hours is far finer than the thing being watched and is a request
 * volume nobody has to think about.
 */
export const CHECK_INTERVAL_MINUTES = 6 * 60;

const OBSERVATION_KEY = "rate-source";

/**
 * Phrases that prove the fetched document is the DevEx page.
 *
 * Without this, an error page, a redirect to a login, or an empty body would
 * contain none of the expected figures and would read as "every rate has been
 * removed" — the loudest possible false alarm from the quietest possible
 * failure.
 */
const ANCHORS = ["Earned Robux", "exchange rate", "Developer Exchange"] as const;

/** A rate: a decimal below one, with three to five places. */
const RATE_PATTERN = /(?<![\d.])0\.\d{3,5}(?![\d])/g;

/** A grouped figure, which is how the minimum is written. */
const AMOUNT_PATTERN = /(?<![\d.,])\d{1,3}(?:,\d{3})+(?![\d.,])/g;

const FRONT_MATTER_DATE = /^last_updated:\s*(\S+)\s*$/m;

export type ObservationStatus =
  /** The document was fetched and recognised. Figures below are what it said. */
  | "read"
  /** Fetched, but it is not the DevEx document. Figures mean nothing. */
  | "unreadable"
  /** Never arrived: refused, timed out, or a non-200 status. */
  | "unreachable";

/** What one check saw. Deliberately a record of the document, not a verdict. */
export interface SourceObservation {
  /** When this check ran, by the Worker's clock. */
  readonly checkedAt: string;
  readonly status: ObservationStatus;
  readonly url: string;
  readonly httpStatus: number | null;
  /** Every rate-shaped figure in the document, deduplicated, in order. */
  readonly rates: readonly string[];
  /** Every grouped figure, which is where the minimum appears. */
  readonly amounts: readonly string[];
  /** Roblox's own `last_updated`, when the document carries one. */
  readonly sourceUpdatedAt: string | null;
  /** Why, when the status is not `read`. Null otherwise. */
  readonly detail: string | null;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/** Roblox's statement of when it last changed the page, if it made one. */
export function readSourceUpdatedAt(document: string): string | null {
  const match = FRONT_MATTER_DATE.exec(document);
  if (!match) return null;
  const value = match[1];
  if (!value || Number.isNaN(Date.parse(value))) return null;
  return value;
}

export function findRateFigures(document: string): string[] {
  return unique(document.match(RATE_PATTERN) ?? []);
}

export function findGroupedAmounts(document: string): string[] {
  return unique(document.match(AMOUNT_PATTERN) ?? []);
}

/** Whether this is the DevEx document at all. See `ANCHORS`. */
export function isRecognisable(document: string): boolean {
  return ANCHORS.every((phrase) => document.includes(phrase));
}

/** Turns a fetched body into an observation, without judging it. */
export function readDocument(
  document: string,
  checkedAt: string,
  httpStatus: number,
  url: string = SOURCE_DOCUMENT_URL,
): SourceObservation {
  const base = {
    checkedAt,
    url,
    httpStatus,
    sourceUpdatedAt: readSourceUpdatedAt(document),
  } as const;

  if (!isRecognisable(document)) {
    return {
      ...base,
      status: "unreadable",
      rates: [],
      amounts: [],
      detail: "The document does not read as Roblox's DevEx page.",
    };
  }

  return {
    ...base,
    status: "read",
    rates: findRateFigures(document),
    amounts: findGroupedAmounts(document),
    detail: null,
  };
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

/** What the registry currently publishes, supplied by the caller. */
export interface ExpectedFigures {
  /** Every rate the site shows, as the exact decimal strings it shows them. */
  readonly rates: readonly string[];
  /** The submission minimum, as a plain integer. */
  readonly minimum: number;
}

export type ComparisonStatus =
  /** Every published figure was in the document, and nothing else was. */
  | "unchanged"
  /** A figure is missing, or one this site does not publish has appeared. */
  | "changed"
  /** The last check could not read the document. Nothing is claimed. */
  | "unreadable"
  /** No check has run, or storage is unavailable. */
  | "unknown";

export interface Comparison {
  readonly status: ComparisonStatus;
  readonly checkedAt: string | null;
  readonly sourceUpdatedAt: string | null;
  /** Published rates the document no longer contains. */
  readonly missingRates: readonly string[];
  /** Rates in the document that this site does not publish. */
  readonly unexpectedRates: readonly string[];
  readonly minimumFound: boolean;
  readonly detail: string | null;
}

/** Digits only, so "30,000" and 30000 are the same figure. */
function digits(value: string): string {
  return value.replace(/,/g, "");
}

/**
 * Compares a stored observation against what the site publishes today.
 *
 * Kept separate from the check itself so that editing the registry
 * re-evaluates the last observation on the next read, rather than leaving a
 * verdict computed against figures the site no longer shows.
 */
export function compareToRegistry(
  observation: SourceObservation | null,
  expected: ExpectedFigures,
): Comparison {
  if (!observation) {
    return {
      status: "unknown",
      checkedAt: null,
      sourceUpdatedAt: null,
      missingRates: [],
      unexpectedRates: [],
      minimumFound: false,
      detail: "No check has run yet.",
    };
  }

  const base = {
    checkedAt: observation.checkedAt,
    sourceUpdatedAt: observation.sourceUpdatedAt,
  } as const;

  if (observation.status !== "read") {
    return {
      ...base,
      status: "unreadable",
      missingRates: [],
      unexpectedRates: [],
      minimumFound: false,
      detail: observation.detail,
    };
  }

  const found = new Set(observation.rates);
  const published = new Set(expected.rates);

  const missingRates = expected.rates.filter((rate) => !found.has(rate));
  const unexpectedRates = observation.rates.filter((rate) => !published.has(rate));
  const minimumFound = observation.amounts.some(
    (amount) => digits(amount) === String(expected.minimum),
  );

  const problems: string[] = [];
  if (missingRates.length > 0) {
    problems.push(`no longer states ${missingRates.join(", ")}`);
  }
  if (unexpectedRates.length > 0) {
    problems.push(`now states ${unexpectedRates.join(", ")}`);
  }
  if (!minimumFound) {
    problems.push(`no longer states a ${expected.minimum.toLocaleString("en-US")} minimum`);
  }

  if (problems.length === 0) {
    return {
      ...base,
      status: "unchanged",
      missingRates: [],
      unexpectedRates: [],
      minimumFound: true,
      detail: null,
    };
  }

  return {
    ...base,
    status: "changed",
    missingRates,
    unexpectedRates,
    minimumFound,
    // Written for a person who has to decide what to do about it, so it says
    // which figure moved rather than that something did.
    detail: `Roblox's page ${problems.join("; ")}.`,
  };
}

// ---------------------------------------------------------------------------
// Storage and the scheduled run
// ---------------------------------------------------------------------------

function isObservation(value: unknown): value is SourceObservation {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.checkedAt === "string" &&
    typeof record.status === "string" &&
    Array.isArray(record.rates)
  );
}

/**
 * Written without an expiry, for the same reason the collector's heartbeat is.
 * A key that expired would turn a check that has stopped running back into a
 * check that has never run, and "no idea" is the worse of the two answers.
 */
export async function readObservation(store: HistoryStore): Promise<SourceObservation | null> {
  const raw = await store.get(OBSERVATION_KEY, "json");
  return isObservation(raw) ? raw : null;
}

export async function writeObservation(
  store: HistoryStore,
  observation: SourceObservation,
): Promise<void> {
  await store.put(OBSERVATION_KEY, JSON.stringify(observation));
}

/** Whether enough time has passed since the last check. */
export function dueForCheck(previous: SourceObservation | null, now: Date): boolean {
  if (!previous) return true;
  const last = Date.parse(previous.checkedAt);
  if (!Number.isFinite(last)) return true;
  return now.getTime() - last >= CHECK_INTERVAL_MINUTES * 60 * 1000;
}

/**
 * One check, if one is due.
 *
 * Returns null when it is not due, so the caller can tell "skipped on purpose"
 * from "ran and found nothing" — the distinction the collector's heartbeat
 * exists to preserve, applied to the same cron.
 *
 * A failure is recorded rather than thrown. An unreachable source is a fact
 * about today worth storing: it is the difference between "checked, unchanged"
 * and a date that has quietly stopped moving.
 */
export async function checkRateSource(
  store: HistoryStore,
  now: Date = new Date(),
  fetchImpl: typeof fetch = fetch,
): Promise<SourceObservation | null> {
  const previous = await readObservation(store);
  if (!dueForCheck(previous, now)) return null;

  const checkedAt = now.toISOString();
  let observation: SourceObservation;

  try {
    const response = await fetchImpl(SOURCE_DOCUMENT_URL, {
      headers: {
        accept: "text/markdown, text/plain;q=0.9, */*;q=0.1",
        "user-agent": "DevExCalculator.org rate check (+https://devexcalculator.org/sources/)",
      },
    });

    if (!response.ok) {
      observation = {
        checkedAt,
        status: "unreachable",
        url: SOURCE_DOCUMENT_URL,
        httpStatus: response.status,
        rates: [],
        amounts: [],
        sourceUpdatedAt: previous?.sourceUpdatedAt ?? null,
        detail: `Roblox returned ${response.status}.`,
      };
    } else {
      observation = readDocument(await response.text(), checkedAt, response.status);
    }
  } catch (error) {
    observation = {
      checkedAt,
      status: "unreachable",
      url: SOURCE_DOCUMENT_URL,
      httpStatus: null,
      rates: [],
      amounts: [],
      sourceUpdatedAt: previous?.sourceUpdatedAt ?? null,
      detail: error instanceof Error ? error.message : "The request failed.",
    };
  }

  await writeObservation(store, observation);
  return observation;
}
