/**
 * The dictionary keys the component beside this one renders.
 *
 * A separate module because that component is `"use client"`, and a Server
 * Component cannot read a value exported from a client module — the bundler
 * replaces those exports with client references, so the import succeeds and
 * the constant arrives as a proxy rather than an array. Plain data belongs in
 * a plain module.
 *
 * Kept beside the component so the two are edited together: a key added to a
 * sentence there is a key the server starts passing, with nothing to
 * remember.
 */
export const GROUP_SPLIT_WORDS: readonly string[] = [
  "calculator.groupSplit.columnCanCashOut",
  "calculator.groupSplit.columnEstimatedPayout",
  "calculator.groupSplit.meetsMinimum",
  "calculator.groupSplit.onePersonPaidTitle",
  "calculator.groupSplit.remainderTitle",
  "calculator.groupSplit.sharesDoNotAddUpTitle",
  "calculator.groupSplit.tableCaption",
  "calculator.groupSplit.tableLabel",
  "calculator.groupSplit.valuedAt",
];
