/**
 * The dictionary keys the error boundary beside this one renders.
 *
 * A separate module because that component is `"use client"`, and a Server
 * Component cannot read a value exported from a client module — the bundler
 * replaces those exports with client references, so the import succeeds and the
 * constant arrives as a proxy rather than an array.
 */
export const ERROR_WORDS: readonly string[] = [
  "errors.boundary.body",
  "errors.boundary.goToCalculator",
  "errors.boundary.reference",
  "errors.boundary.title",
  "errors.boundary.tryAgain",
];
