/**
 * Every string the stock quote island renders.
 *
 * A separate module because the island is `"use client"`, and a value exported
 * from a client module reaches a Server Component as a client reference rather
 * than as the array itself. The server copies exactly these keys out of the
 * dictionary and hands them over as a plain object, so no dictionary — and
 * therefore no seven languages of every namespace — reaches the browser.
 */
export const STOCK_QUOTE_WORDS: readonly string[] = [
  "platform.stock.loadingTitle",
  "platform.stock.loadingBody",
  "platform.stock.notLatestBadge",
  "platform.stock.notLatestBody",
  "platform.stock.providerSilentTitle",
  "platform.stock.providerSilentBody",
  "platform.stock.noPriceConfiguredTitle",
  "platform.stock.noPriceConfiguredBody",
  "platform.stock.prose.onlyConfiguration",
  "platform.stock.andSeparator",
  "platform.stock.body.related.p3",
];
