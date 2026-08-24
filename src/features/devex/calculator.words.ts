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
  ...CONTROLS_WORDS,
  ...RESULTS_WORDS,
  "calculator.body.intro.p1",
  "calculator.body.intro.p2",
  "calculator.body.intro.p5",
  "calculator.deductions.flatFeeLabel",
  "calculator.deductions.percentageFeeLabel",
  "calculator.deductions.summary",
  "calculator.deductions.taxLabel",
  "calculator.deductions.yourFiguresNote",
  "calculator.inputs.currentBalance.label",
  "calculator.inputs.eligibleEarnedRobux.label",
  "calculator.inputs.payoutTarget.label",
  "calculator.results.copyResult",
  "calculator.results.copySummary",
  "calculator.results.nothingSaved",
  "calculator.results.summaryTitle",
  "calculator.srHeading",
  "routes.home.sections.rate-comparison",
];
