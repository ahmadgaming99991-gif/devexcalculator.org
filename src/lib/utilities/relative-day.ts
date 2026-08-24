/**
 * How long ago, in words, computed where it is read.
 *
 * Every page here is prerendered, so an age written at build time is wrong by
 * the time anyone sees it — "4 days ago" would still say four days a month
 * later. These are used from client components that recompute the age against
 * the reader's own clock, which makes it right every day with no rebuild.
 *
 * Shared rather than duplicated because two things now report an age: the day
 * the rate registry was verified by a person, and the day it was last checked
 * against Roblox's own document by the scheduled job. Two copies of this would
 * have been two places for the wording to drift.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days between a recorded instant and now. Never negative. */
export function ageInDays(iso: string, now: number): number {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, Math.floor((now - then) / DAY_MS));
}

/** The three ways this is said, in one language. */
export interface RelativeDayWords {
  readonly today: string;
  readonly yesterday: string;
  /** Carries a `{days}` token. */
  readonly daysAgo: string;
}

/**
 * Plain words for a small number of days; a figure once it stops being one.
 *
 * The words are passed in rather than looked up. This runs inside a Client
 * Component, and a dictionary reached from here would be a dictionary in the
 * browser bundle — in every language, on every page.
 *
 * Zero and one are separate cases rather than a plural rule because they are
 * different words in every language this site has, and picking the plural form
 * of a count is a job for the translation, not for a switch here: languages
 * with more than two forms would need more branches than English can name.
 */
export function describeAge(days: number, words: RelativeDayWords): string {
  if (days <= 0) return words.today;
  if (days === 1) return words.yesterday;
  return words.daysAgo.replace("{days}", String(days));
}
