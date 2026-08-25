import { PARSE_MESSAGE_WORDS } from "@/i18n/parse-message.words";
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
  ...PARSE_MESSAGE_WORDS,
  "calculator.groupSplit.belowMinimumBody.one",
  "calculator.groupSplit.belowMinimumBody.other",
  "calculator.groupSplit.belowMinimumTitle.one",
  "calculator.groupSplit.belowMinimumTitle.other",
  "calculator.groupSplit.body.intro.p2",
  "calculator.groupSplit.body.intro.p3",
  "calculator.groupSplit.body.intro.p5",
  "calculator.groupSplit.columnCanCashOut",
  "calculator.groupSplit.columnEstimatedPayout",
  "calculator.groupSplit.earnedOnlyNote",
  "calculator.groupSplit.meetsMinimum",
  "calculator.groupSplit.onePersonPaidTitle",
  "calculator.groupSplit.prose.robloxDoesNotDivide",
  "calculator.groupSplit.remainderTitle",
  "calculator.groupSplit.sharesDoNotAddUpTitle",
  "calculator.groupSplit.tableCaption",
  "calculator.groupSplit.tableLabel",
  "calculator.groupSplit.valuedAt",
];
