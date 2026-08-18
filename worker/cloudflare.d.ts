/**
 * The two Workers runtime types this entry point needs.
 *
 * Declared rather than pulled in from `@cloudflare/workers-types`, which
 * redefines `Request` and `Response` globally and collides with the DOM types
 * the Next.js application is compiled against. Two interfaces are a smaller
 * change than reconciling two global type universes.
 */

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface ScheduledEvent {
  /** Milliseconds since the epoch for the scheduled time. */
  readonly scheduledTime: number;
  /** The cron expression that fired, as configured in wrangler.jsonc. */
  readonly cron: string;
}
