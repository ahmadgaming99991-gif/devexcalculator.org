/**
 * Every sentence  can name.
 *
 * A Client Component holds its own copy of the words it renders, and the one
 * it needs for a refused input is chosen by the parser at the moment somebody
 * types — so all of them have to be there. Derived from the parser rather than
 * listed by hand: a new refusal is a new key, and a key the server did not
 * send throws in front of the reader who typed the thing.
 */
export const PARSE_MESSAGE_WORDS: readonly string[] = [
  "errors.input.amountExample",
  "errors.input.digitsOnly",
  "errors.input.empty",
  "errors.input.mixedSeparators",
  "errors.input.multipleDecimalPoints",
  "errors.input.numberExample",
  "errors.input.percentExample",
  "errors.input.percentRange",
  "errors.input.positiveOnly",
  "errors.input.robuxLimit",
  "errors.input.robuxWholeUnits",
  "errors.input.scientificNotation",
  "errors.input.thousandsSeparators",
  "errors.input.tooLong",
  "errors.input.tooManyDecimals",
  "errors.input.tooManyDecimalsOne",
  "errors.input.valueLimit",
];
