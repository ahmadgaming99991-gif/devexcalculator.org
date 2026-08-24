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
export const PLANNER_WORDS: readonly string[] = [
  "calculator.deductions.flatFeeLabel",
  "calculator.deductions.percentageFeeLabel",
  "calculator.deductions.taxLabel",
  "calculator.groupSplit.columnEstimatedPayout",
  "calculator.planner.body.intro.p1",
  "calculator.planner.body.intro.p2",
  "calculator.planner.body.intro.p3",
  "calculator.planner.body.intro.p4",
  "calculator.planner.columnRobuxNeeded",
  "calculator.planner.currentBalanceLabel",
  "calculator.planner.expectedEarningsLabel",
  "calculator.planner.feesAndTax",
  "calculator.planner.flatFeeEntered",
  "calculator.planner.grossPayout",
  "calculator.planner.modeDate",
  "calculator.planner.modeEarn",
  "calculator.planner.percentageFeeEntered",
  "calculator.planner.planningAgainst",
  "calculator.planner.reductionDescription",
  "calculator.planner.reductionHeading",
  "calculator.planner.targetLabel",
  "calculator.planner.taxEntered",
  "calculator.planner.totalNeeded",
  "calculator.planner.underEachRateDescription",
  "calculator.planner.underEachRateHeading",
  "calculator.planner.whatDoYouKnow",
  "calculator.planner.whatThisIsNot",
];
