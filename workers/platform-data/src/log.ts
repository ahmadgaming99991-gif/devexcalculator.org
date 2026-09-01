/**
 * Structured logging, and a rule about what never enters it.
 *
 * One line per event, JSON, so Workers Logs can be filtered by `event` and
 * `unit` rather than by substring. Nothing here logs a request URL, a header, an
 * IP, a cookie, or any bound secret: this Worker serves public data and has no
 * legitimate reason to record who asked for it.
 *
 * Upstream failures log the message the runtime produced, which is a description
 * of a network condition, and the upstream host - never the full URL, so a query
 * string can never carry anything into a log by accident.
 */

type Level = "info" | "warn" | "error";

export interface LogFields {
  readonly event: string;
  readonly unit?: string;
  readonly outcome?: string;
  readonly detail?: string | null;
  readonly ms?: number;
  readonly reads?: number;
  readonly writes?: number;
  readonly subrequests?: number;
  readonly items?: number;
  readonly host?: string;
  readonly status?: number;
}

/*
 * `console.warn` for informational lines too, not `console.log`.
 *
 * The repository forbids `console.log`, and this is the rare place where that
 * rule and the intent agree: Workers Logs treats both the same, the `level`
 * field in the payload is what a filter actually reads, and a scheduled unit
 * reporting what it did is something an operator wants to see by default.
 */
function emit(level: Level, fields: LogFields): void {
  const line = JSON.stringify({ level, ...fields });
  if (level === "error") console.error(line);
  else console.warn(line);
}

export const log = {
  info: (fields: LogFields) => emit("info", fields),
  warn: (fields: LogFields) => emit("warn", fields),
  error: (fields: LogFields) => emit("error", fields),
};

/**
 * An error reduced to something safe to record.
 *
 * Errors from `fetch` and `AbortSignal.timeout` carry only a condition
 * ("The operation was aborted"), which is what is wanted. Anything else is
 * stringified and truncated so an unexpected error carrying a payload cannot
 * write that payload into the log.
 */
export function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 200 ? `${message.slice(0, 200)}...` : message;
}
