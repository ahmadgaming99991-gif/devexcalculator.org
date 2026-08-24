import { Fragment, type ReactNode } from "react";

/**
 * A translated sentence with something rendered inside it.
 *
 * Most sentences on this site are plain strings and `interpolate` is enough.
 * Some contain a link, or a bolded phrase, in the middle:
 *
 *     Check anything you rely on against the documentation linked from the
 *     <InlineLink href="/sources/">source registry</InlineLink> before making
 *     a decision that matters.
 *
 * Written as JSX that is three pieces, and the obvious extraction keeps it as
 * three: the text before, the link label, the text after. That works in
 * English and only in English. The link does not sit in the same place in a
 * German sentence, and a renderer that concatenates before-link-after in
 * source order cannot put it anywhere else — so the translator is forced to
 * write around a hole they cannot move, which is how a translated page ends up
 * reading like it was assembled rather than written.
 *
 * So the sentence stays one string with a named token, exactly like a value:
 *
 *     "…linked from the {sources} before making a decision that matters."
 *
 * and the token is filled with an element instead of a number. A translator
 * moves `{sources}` to wherever the sentence needs it, and the label it wraps
 * is its own key, translated as the phrase it is.
 *
 * The rules match `interpolate` deliberately, because a translator should not
 * have to know which of the two will read their string:
 *
 *   - Tokens are filled by name, never by position.
 *   - An unknown token is left visible rather than dropped. A stray `{sources}`
 *     on the page is a bug report; a silently missing link is a dead end that
 *     nobody notices.
 *   - A token may appear more than once, and each occurrence is filled.
 *
 * The one thing it adds is that a `ReactNode` cannot be concatenated, so the
 * result is a fragment rather than a string.
 */
export function rich(
  template: string,
  parts: Readonly<Record<string, ReactNode>>,
): ReactNode {
  const pieces: ReactNode[] = [];
  const pattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  let index = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(template)) !== null) {
    const token = match[1] as string;
    if (!(token in parts)) continue;
    if (match.index > index) pieces.push(template.slice(index, match.index));
    /*
     * The key is the token plus where it appeared. A token used twice would
     * otherwise give two siblings the same key, and React would keep the first
     * element's state for the second — which for a link means the wrong href
     * surviving a re-render.
     */
    pieces.push(<Fragment key={`${token}-${match.index}`}>{parts[token]}</Fragment>);
    index = match.index + match[0].length;
  }

  if (index < template.length) pieces.push(template.slice(index));
  return <>{pieces}</>;
}
