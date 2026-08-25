/**
 * The words the language selector renders.
 *
 * A separate module because the selector is `"use client"` — it needs the
 * current pathname, which a layout is not given — and a Server Component
 * cannot read a value exported from a client module.
 */
export const LANGUAGE_SELECTOR_WORDS: readonly string[] = ["navigation.language.label"];
