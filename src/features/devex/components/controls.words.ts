/**
 * The dictionary keys the calculator's input controls render.
 *
 * These components are handed a `t` by the one that renders them rather
 * than building their own, so their keys have to reach the server's copy
 * through that component's list. A key added here and not there throws at
 * render — which is what it did.
 */
export const CONTROLS_WORDS: readonly string[] = [
  "calculator.controls.body.intro.p1",
  "calculator.controls.body.presetsLabel.p1",
];
