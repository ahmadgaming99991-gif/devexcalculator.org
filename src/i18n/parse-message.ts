import type { Translate } from "@/i18n/get-dictionary";
import type { ParseResult } from "@/lib/calculations/parse-amount";

/**
 * What to show under an input, in the reader's language.
 *
 * `parse-amount` is pure arithmetic with no locale: it names the sentence and
 * supplies the values, and this turns that into words. Null for a value that
 * parsed, so a caller can write `error={parseMessage(t, result)}` and get
 * nothing when there is nothing wrong.
 */
export function parseMessage<T>(t: Translate, result: ParseResult<T> | null): string | null {
  if (!result || result.ok) return null;
  return t(result.messageKey, result.messageValues);
}
