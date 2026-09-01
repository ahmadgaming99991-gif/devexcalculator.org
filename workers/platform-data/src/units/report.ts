/**
 * What one scheduled unit did, in the shape every unit returns.
 *
 * `skipped` is a first-class outcome and not an error: an upstream that did not
 * answer, or a value that is not there yet, is a fact to record rather than a
 * failure to retry. `failed` is reserved for a unit that threw, which the
 * dispatcher catches so a Cron Trigger is never retried into the same fault.
 */
export interface UnitReport {
  readonly unit: string;
  readonly outcome: "recorded" | "skipped" | "failed";
  readonly detail: string | null;
  readonly subrequests: number;
  readonly reads: number;
  readonly writes: number;
  /** Rows, series or points the unit actually touched. */
  readonly items: number;
}
