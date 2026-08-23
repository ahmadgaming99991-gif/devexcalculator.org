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

/** Plain words for a small number of days; a figure once it stops being one. */
export function describeAge(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
