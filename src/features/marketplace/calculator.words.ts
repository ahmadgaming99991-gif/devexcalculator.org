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
import { ACTION_WORDS } from "@/features/devex/components/actions.words";

export const MARKETPLACE_WORDS: readonly string[] = [
  ...PARSE_MESSAGE_WORDS,
  ...ACTION_WORDS,
  "calculator.modes.label",
  "marketplace.body.intro.p1",
  "marketplace.body.intro.p2",
  "marketplace.body.intro.p3",
  "marketplace.inputs.afterCommissionHint",
  "marketplace.modes.after.description",
  "marketplace.modes.after.label",
  "marketplace.modes.before.description",
  "marketplace.modes.before.label",
  "marketplace.prose.notAppliedTwice",
  "marketplace.results.chargeTheBuyer",
  "marketplace.results.columnGoesTo",
  "marketplace.results.copyResult",
  "marketplace.results.copySummary",
  "marketplace.results.estimateFrom",
  "marketplace.results.experienceOwner",
  "marketplace.results.tableCaption",
  "marketplace.results.tableLabel",
  "marketplace.results.youActuallyKeep",
  "marketplace.srHeading",
];
