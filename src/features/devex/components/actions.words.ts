/**
 * The dictionary keys the copy and share buttons render.
 *
 * A separate module because those components are `"use client"`, and a Server
 * Component cannot read a value exported from a client module — the bundler
 * replaces those exports with client references, so the import succeeds and the
 * constant arrives as a proxy rather than an array.
 *
 * Spread into the word list of every calculator that renders a copy button, so
 * one list holds every sentence one island can say.
 */
export const ACTION_WORDS: readonly string[] = [
  "calculator.actions.copied",
  "calculator.actions.copiedLabel",
  "calculator.actions.copyFailed",
  "calculator.actions.copyFailedLabel",
  "calculator.actions.copyLink",
  "calculator.actions.share",
  "calculator.actions.shareCopied",
  "calculator.actions.shareCopyFailed",
];
