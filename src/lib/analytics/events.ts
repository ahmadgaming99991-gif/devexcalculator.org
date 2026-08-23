/**
 * The only events this site is allowed to send, and the only fields they may
 * carry.
 *
 * The reason this is a module rather than a handful of `gtag` calls: analytics
 * on a calculator is a privacy problem waiting to happen. Every value a
 * creator types here is a fact about their income — how much they have earned,
 * what they are aiming for, what tax they expect to pay — and the natural way
 * to write an event is to attach the number that just changed. That is the one
 * thing that must never happen.
 *
 * So the allowlist is the design. A property that is not declared here cannot
 * be sent, `sanitiseEvent` drops it rather than passing it through, and a test
 * feeds it a realistic payload full of amounts to prove they are stripped.
 *
 * Three further rules:
 *
 *   - **Nothing fires without a configured provider.** Unset is the default
 *     and the current state.
 *   - **Nothing fires without consent**, where the provider needs it. GA4 sets
 *     cookies; Cloudflare Web Analytics does not and has no events.
 *   - **Nothing fires on a keystroke.** Every event here names a committed
 *     action — a mode chosen, a result copied, a file downloaded — not a
 *     value changing.
 */

/** Every event name this site may emit. */
export const EVENT_NAMES = [
  "calculator_mode_selected",
  "rate_selected",
  "currency_selected",
  "minimum_state_reached",
  "result_copied",
  "summary_copied",
  "share_link_created",
  "calculation_saved",
  "planner_mode_selected",
  "planner_completed",
  "official_source_clicked",
  "platform_range_selected",
  "platform_ranking_selected",
  "data_exported",
  "navigation_group_opened",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

/**
 * Properties an event may carry, and what each may contain.
 *
 * Every one is a category, never a quantity. `minimum_state` is the closest
 * this gets to describing a balance, and it is deliberately one bit: whether
 * the entered amount is under the documented minimum or not. That is enough to
 * learn "most visitors are below the threshold" without learning anyone's
 * balance.
 */
export interface EventProperties {
  readonly mode?: "quick" | "split" | "target";
  readonly planner_mode?: "pace" | "deadline";
  readonly rate_id?: string;
  readonly currency?: string;
  readonly minimum_state?: "below" | "meets";
  readonly range_days?: number;
  readonly ranking?: string;
  readonly format?: "csv" | "json";
  readonly dataset?: "stats" | "platform" | "platform-experiences";
  readonly nav_group?: string;
  readonly outcome?: "success" | "failure" | "unsupported";
  readonly destination?: string;
}

/** The allowlist, as a runtime value. Adding a key here is a deliberate act. */
const ALLOWED_PROPERTIES = [
  "mode",
  "planner_mode",
  "rate_id",
  "currency",
  "minimum_state",
  "range_days",
  "ranking",
  "format",
  "dataset",
  "nav_group",
  "outcome",
  "destination",
] as const satisfies readonly (keyof EventProperties)[];

/** Values that are categories rather than free text, so they stay short. */
const MAX_VALUE_LENGTH = 64;

/**
 * Keeps only declared properties, and only in a shape that cannot carry a
 * quantity.
 *
 * `range_days` is the single numeric property, and it is a chart selection the
 * reader made from a fixed set — never anything they typed. Every other value
 * is trimmed to a short string, so a caller cannot smuggle a balance through a
 * field meant for a currency code.
 */
export function sanitiseEvent(properties: Readonly<Record<string, unknown>>): EventProperties {
  const clean: Record<string, string | number> = {};

  for (const key of ALLOWED_PROPERTIES) {
    const value = properties[key];
    if (value === undefined || value === null) continue;

    if (key === "range_days") {
      // A whole, small, positive number or nothing. Not a balance.
      if (typeof value !== "number" || !Number.isInteger(value) || value <= 0 || value > 3_650) {
        continue;
      }
      clean[key] = value;
      continue;
    }

    // Everything else is a category. A number arriving where a string belongs
    // is the shape a leaked amount would take, so it is dropped rather than
    // coerced.
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed === "" || trimmed.length > MAX_VALUE_LENGTH) continue;
    clean[key] = trimmed;
  }

  return clean as EventProperties;
}

/**
 * The page path, with any calculator state removed.
 *
 * A shared calculation URL carries the amount in its query string, so sending
 * the full path would defeat every other rule here.
 */
export function sanitisePath(url: string): string {
  try {
    const parsed = new URL(url, "https://devexcalculator.org");
    return parsed.pathname;
  } catch {
    return "/";
  }
}

export function isEventName(value: string): value is EventName {
  return (EVENT_NAMES as readonly string[]).includes(value);
}
