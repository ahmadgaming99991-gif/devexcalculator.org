import { PARSE_MESSAGE_WORDS } from "@/i18n/parse-message.words";
import { ACTION_WORDS } from "./components/actions.words";
import { CONTROLS_WORDS } from "./components/controls.words";
import { RESULTS_WORDS } from "./components/results.words";

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
export const CALCULATOR_WORDS: readonly string[] = [
  ...PARSE_MESSAGE_WORDS,
  ...ACTION_WORDS,
  ...CONTROLS_WORDS,
  ...RESULTS_WORDS,
  "calculator.body.intro.p1",
  "calculator.body.intro.p2",
  "calculator.body.intro.p3",
  "calculator.body.intro.p5",
  "calculator.deductions.flatFeeLabel",
  "calculator.deductions.percentageFeeLabel",
  "calculator.deductions.summary",
  "calculator.deductions.taxHint",
  "calculator.deductions.taxLabel",
  "calculator.deductions.yourFiguresNote",
  "calculator.history.summary",
  "calculator.inputs.currentBalance.hint",
  "calculator.inputs.currentBalance.label",
  "calculator.inputs.eligibleEarnedRobux.hint",
  "calculator.inputs.eligibleEarnedRobux.label",
  "calculator.inputs.legacyBucketHint",
  "calculator.inputs.payoutTarget.hint",
  "calculator.inputs.payoutTarget.label",
  "calculator.inputs.rateToApply.label",
  "calculator.inputs.standardBucketHint",
  "calculator.inputs.us18BucketHint",
  "calculator.modes.advanced.description",
  "calculator.modes.advanced.label",
  "calculator.modes.quick.description",
  "calculator.modes.quick.label",
  "calculator.modes.target.description",
  "calculator.modes.target.label",
  "calculator.results.announceQuick",
  "calculator.results.announceRate",
  "calculator.results.announceSplit",
  "calculator.results.announceSplitGross",
  "calculator.results.announceTarget",
  "calculator.results.copyDisclaimer",
  "calculator.results.copyResult",
  "calculator.results.copySummary",
  "calculator.results.estimatedPayout",
  "calculator.results.nothingSaved",
  "calculator.results.robuxNeeded",
  "calculator.results.summary.afterEstimates",
  "calculator.results.summary.bucketLine",
  "calculator.results.summary.earnedRobux",
  "calculator.results.summary.estimatedPayout",
  "calculator.results.summary.grossPayout",
  "calculator.results.summary.minimumApplies",
  "calculator.results.summary.minimumMet",
  "calculator.results.summary.minimumShort",
  "calculator.results.summary.payoutTarget",
  "calculator.results.summary.rate",
  "calculator.results.summary.robuxNeeded",
  "calculator.results.summaryTitle",
  "calculator.srHeading",
];
