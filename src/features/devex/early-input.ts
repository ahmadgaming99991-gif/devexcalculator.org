/**
 * Keeps what the reader typed before the page became interactive.
 *
 * The calculator's fields are React-controlled, and their server-rendered HTML
 * is empty. Someone who starts typing before hydration is typing into a plain
 * DOM input that nothing is listening to; when React arrives it assigns the
 * value it believes in — the empty one — and the typing is gone.
 *
 * Measured on production over four cold loads at 390px, typing as soon as the
 * field could be clicked: the value survived once. Twice it was erased
 * completely, and once it came back as `000` — the first three keystrokes lost
 * and the rest kept, because hydration landed mid-word. On a phone, on a slow
 * connection, this is the ordinary case rather than a rare one, and it defeats
 * the whole point of a calculator that answers as you type.
 *
 * Nothing inside React can fix it. By the time any effect runs, the commit that
 * overwrote the field has already happened — which is why this is a listener
 * installed before the markup is parsed, and why it lives in the document
 * rather than in a component.
 *
 * It is deliberately small and total: one delegated listener, one plain object,
 * no framework, no storage, nothing that can throw. Fields opt in with
 * `data-early-key`, whose value is the calculator state field it feeds, so
 * adopting the result is a single state update rather than a lookup table.
 */

/** The global the script below writes to, and `readEarlyInput` reads from. */
const GLOBAL = "__devexEarlyInput";

/**
 * Runs as the first script in `<body>`, before any of the markup it watches
 * exists — a delegated listener on the document needs no element to be present
 * yet, which is the reason it is delegated.
 *
 * Capture phase, so it still sees the event if anything downstream stops it.
 */
export const earlyInputScript = `
(function(){
  try {
    var stash = {};
    window.${GLOBAL} = stash;
    var capture = function(event){
      var el = event.target;
      if (!el || !el.getAttribute) return;
      var key = el.getAttribute('data-early-key');
      if (key) stash[key] = el.value;
    };
    document.addEventListener('input', capture, true);
    document.addEventListener('change', capture, true);
  } catch (e) {}
})();
`.trim();

/**
 * The state fields a reader can type into, and so the ones worth recovering.
 *
 * Each name is both the `data-early-key` on the input and a key of
 * `CalculatorState`, which is what lets the result be spread straight onto the
 * state with no lookup table in between.
 */
const KEYS = [
  "robux",
  "standardRobux",
  "legacyRobux",
  "us18Robux",
  "targetUsd",
  "currentRobux",
  "feePercent",
  "flatFeeUsd",
  "taxPercent",
] as const;

/** Claimed at most once. See `earlyTypedPatch`. */
let claimed: string | null = null;

/**
 * Everything typed before hydration, as JSON, and always the same string.
 *
 * The sameness is the point. This is read through `useSyncExternalStore`, which
 * calls its snapshot repeatedly and loops forever if the value keeps changing —
 * and the underlying stash empties itself as it is read, so an unmemoised
 * version would return the keystrokes once and `{}` from then on. Claiming once
 * into a module-scope string makes it stable for the life of the page.
 *
 * Emptying as it reads is deliberate for a second reason: a value the reader
 * has since cleared must not come back when a field remounts, which is what
 * switching calculator modes does.
 *
 * JSON rather than an object because a snapshot is compared by identity, and a
 * fresh object every call is a fresh identity every call.
 *
 * Returns `{}` on the server, where there is no document, and on any page whose
 * script did not run.
 */
export function earlyTypedPatch(): string {
  if (claimed !== null) return claimed;
  claimed = JSON.stringify(readStash());
  return claimed;
}

function readStash(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const stash = (window as unknown as Record<string, unknown>)[GLOBAL];
  if (!stash || typeof stash !== "object") return {};

  const source = stash as Record<string, string>;
  const out: Record<string, string> = {};
  for (const key of KEYS) {
    const value = source[key];
    // A real string, and never an empty one: adopting "" would blank a field
    // that a shared link had just restored.
    if (typeof value === "string" && value !== "") out[key] = value;
    delete source[key];
  }
  return out;
}
