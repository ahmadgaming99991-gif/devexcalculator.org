/**
 * The words the theme toggle renders.
 *
 * A separate module because the toggle is `"use client"`, and a value exported
 * from a client module reaches a Server Component as a client reference rather
 * than as the array itself.
 *
 * The three theme names are listed rather than derived because the component
 * chooses between them with a computed key — `` t(`common.theme.${theme}`) `` —
 * which no scan of the source can resolve to a literal. The one it would miss
 * is whichever theme the person testing it did not happen to be using.
 */
export const THEME_TOGGLE_WORDS: readonly string[] = [
  "common.theme.dark",
  "common.theme.light",
  "common.theme.system",
  "common.theme.toggleLabel",
];
