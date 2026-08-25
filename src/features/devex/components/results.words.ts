/**
 * The dictionary keys the calculator's result panels render.
 *
 * These components are handed a `t` by the one that renders them rather
 * than building their own, so their keys have to reach the server's copy
 * through that component's list. A key added here and not there throws at
 * render — which is what it did.
 */
export const RESULTS_WORDS: readonly string[] = [
  "calculator.currency.loading",
  "calculator.currency.provenance",
  "calculator.currency.staleAged",
  "calculator.currency.staleHeading",
  "calculator.currency.staleSnapshot",
  "calculator.currency.unavailable",
  "calculator.deductions.estimatedNet",
  "calculator.deductions.flatFee",
  "calculator.deductions.grossPayout",
  "calculator.deductions.heading",
  "calculator.deductions.percentageFee",
  "calculator.deductions.taxEstimate",
  "calculator.results.blendedRate",
  "calculator.results.body.intro.p1",
  "calculator.results.body.intro.p3",
  "calculator.results.body.intro.p4",
  "calculator.results.body.intro.p5",
  "calculator.results.body.intro.p7",
  "calculator.results.bucketTableCaption",
  "calculator.results.bucketTableLabel",
  "calculator.results.comparisonTableLabel",
  "calculator.results.ifAllStandard",
  "calculator.target.minimumAppliesFirstTitle",
  "calculator.target.progressLabel",
];
