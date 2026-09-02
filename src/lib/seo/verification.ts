import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

/**
 * Search Console, Bing Webmaster Tools and Yandex Webmaster ownership tags.
 *
 * All three will also accept a DNS record or an uploaded file, and either
 * is a better choice than a meta tag because it does not put a token in every
 * page of HTML the site serves. The tag is here for the case where the owner
 * has no access to DNS, which is the situation these tools are usually
 * verified from.
 *
 * The rule that matters: **a tag is emitted only for a value that could
 * plausibly be real.** A verification tag carrying `YOUR_TOKEN_HERE` is worse
 * than no tag at all — it looks configured, it verifies nothing, and it is
 * exactly the kind of thing that survives in a `<head>` for a year because
 * nobody re-reads it. Anything blank, placeholder-shaped or too short to be a
 * token is dropped, and the site simply says nothing about ownership.
 *
 * These are public identifiers, not secrets: they prove the person who holds
 * the console account also controls the site, and are visible in the HTML of
 * every site that uses them. They are still read from the environment rather
 * than committed, because they belong to whoever owns the property.
 */

/**
 * The shortest token any of the three issues.
 * Google's token is 43 characters, Bing's is 32 and Yandex's is 16; under that
 * is a typo, a truncation or someone's note to themselves.
 */
const MIN_TOKEN_LENGTH = 16;

/** Words that mean "not filled in yet", in the forms they actually appear. */
const PLACEHOLDER = /(^|[^a-z])(your|example|sample|placeholder|todo|changeme|test|xxx+)([^a-z]|$)/i;

export function isUsableToken(value: string | null | undefined): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length < MIN_TOKEN_LENGTH) return false;
  // A real token is one opaque run of characters. Whitespace means someone
  // pasted a sentence, or the tag itself rather than its content.
  if (/\s/.test(trimmed)) return false;
  if (/[<>"']/.test(trimmed)) return false;
  return !PLACEHOLDER.test(trimmed);
}

/**
 * The `verification` block for the root layout, or `undefined`.
 *
 * `undefined` rather than an empty object, so Next emits no tag at all rather
 * than an empty one.
 */
export function buildVerification(): Metadata["verification"] | undefined {
  const google = siteConfig.verification.google;
  const bing = siteConfig.verification.bing;
  const yandex = siteConfig.verification.yandex;

  const usableGoogle = isUsableToken(google) ? google : null;
  const usableBing = isUsableToken(bing) ? bing : null;
  const usableYandex = isUsableToken(yandex) ? yandex : null;
  if (!usableGoogle && !usableBing && !usableYandex) return undefined;

  return {
    ...(usableGoogle ? { google: usableGoogle } : {}),
    // Yandex has a dedicated field, and its token is exactly sixteen
    // characters — the shortest thing `isUsableToken` accepts, and the reason
    // that bound is `< 16` rather than `<= 16`.
    ...(usableYandex ? { yandex: usableYandex } : {}),
    // Bing has no dedicated field in Next's metadata type; its tag name is
    // `msvalidate.01`, which is what `other` exists for.
    ...(usableBing ? { other: { "msvalidate.01": usableBing } } : {}),
  };
}
