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
import { RATE_WORDS } from "@/i18n/data-words";

export const PLANNER_WORDS: readonly string[] = [
  ...PARSE_MESSAGE_WORDS,
  ...RATE_WORDS,
  "calculator.deductions.flatFeeLabel",
  "calculator.deductions.percentageFeeLabel",
  "calculator.deductions.taxLabel",
  "calculator.groupSplit.columnEstimatedPayout",
  "calculator.planner.alreadyEnoughDetail",
  "calculator.planner.alreadyEnoughHeadline",
  "calculator.planner.alreadyReached",
  "calculator.planner.alreadyThere",
  "calculator.planner.belowMinimumNote",
  "calculator.planner.body.intro.p1",
  "calculator.planner.body.intro.p2",
  "calculator.planner.body.intro.p3",
  "calculator.planner.body.intro.p4",
  "calculator.planner.columnAmount",
  "calculator.planner.columnNeededEachDay",
  "calculator.planner.columnRate",
  "calculator.planner.columnReachedIn",
  "calculator.planner.columnRobuxNeeded",
  "calculator.planner.columnStage",
  "calculator.planner.columnStillToEarn",
  "calculator.planner.currentBalanceLabel",
  "calculator.planner.datePassedHeadline",
  "calculator.planner.deadlineLabel",
  "calculator.planner.earnedOnlyNote",
  "calculator.planner.expectedEarningsLabel",
  "calculator.planner.feesAndTax",
  "calculator.planner.flatFeeEntered",
  "calculator.planner.grossPayout",
  "calculator.planner.modeDate",
  "calculator.planner.modeEarn",
  "calculator.planner.notAtThisPace",
  "calculator.planner.paceDetail",
  "calculator.planner.paceHeadline",
  "calculator.planner.paceHeadlineNoDate",
  "calculator.planner.paceHint",
  "calculator.planner.pacePeriod.day",
  "calculator.planner.pacePeriod.month",
  "calculator.planner.pacePeriod.week",
  "calculator.planner.payoutNote",
  "calculator.planner.perLabel",
  "calculator.planner.percentageFeeEntered",
  "calculator.planner.pickDateHeadline",
  "calculator.planner.pickFutureDate",
  "calculator.planner.planHeading",
  "calculator.planner.planningAgainst",
  "calculator.planner.progressNote",
  "calculator.planner.prose.estimateNotice",
  "calculator.planner.rateToPlanAgainst",
  "calculator.planner.reductionDescription",
  "calculator.planner.reductionHeading",
  "calculator.planner.requiredDetail",
  "calculator.planner.requiredHeadline",
  "calculator.planner.stillToEarn",
  "calculator.planner.targetHint",
  "calculator.planner.targetLabel",
  "calculator.planner.taxEntered",
  "calculator.planner.totalNeeded",
  "calculator.planner.underEachRateDescription",
  "calculator.planner.underEachRateHeading",
  "calculator.planner.whatDoYouKnow",
  "calculator.planner.whatThisIsNot",
  "calculator.planner.withADate",
  "calculator.planner.worksOutDate",
  "calculator.planner.worksOutPace",
  "calculator.planner.zeroEarnings",
  "calculator.planner.zeroEarningsHeadline",
  "common.spans.days.one",
  "common.spans.days.other",
  "common.spans.months.one",
  "common.spans.months.other",
  "common.spans.weeks.one",
  "common.spans.weeks.other",
];
