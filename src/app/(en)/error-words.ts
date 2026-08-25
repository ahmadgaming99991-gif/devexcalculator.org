/**
 * The error boundary's words, in English.
 *
 * An error boundary is a Client Component that Next can render before any
 * server work has happened, so it cannot await a dictionary. These are copied
 * from `src/i18n/locales/en/errors.json`, and a unit test asserts that each
 * one still matches — so the file that ships and the dictionary that is
 * validated cannot drift apart without a test going red.
 */
import type { LocaleWords } from "@/i18n/client-words";

export const EN_ERROR_WORDS: LocaleWords = {
  "errors.boundary.body": "The calculator itself is unaffected — calculations run in your browser and do not depend on this page loading. Try again, or go straight to the calculator.",
  "errors.boundary.goToCalculator": "Go to the calculator",
  "errors.boundary.reference": "If you report this, quote reference {digest}.",
  "errors.boundary.title": "Something went wrong on this page",
  "errors.boundary.tryAgain": "Try again",
};
