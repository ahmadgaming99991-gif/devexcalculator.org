import { describe, expect, it } from "vitest";
import { localizedQuarters } from "../../../scripts/i18n/audit/numbers";

/**
 * `Q2`, in five other notations.
 *
 * The audit reported fifteen findings saying a quarter label "spells it out and
 * the wording cannot be checked from here". Twelve of them had the digit in
 * plain sight — `2º trimestre`, `2e trimestre`, `2. Quartal`, `2. çeyreği` —
 * and were only unverifiable because the check looked for the literal `Qn`
 * form and nothing else.
 *
 * That is the wrong kind of honest. Fifteen items on a reviewer's list, twelve
 * of which a regex can settle, is how the three that genuinely need a reader
 * get lost. Worse, it was filed at `review`, so a quarter that had actually
 * been corrupted would have been reported in the same breath as twelve correct
 * ones and gated nothing.
 */

describe("quarters written the way a language writes them", () => {
  it("reads the digit out of each locale's own notation", () => {
    expect(localizedQuarters("no 2º trimestre de 2026")).toEqual(["2"]);
    expect(localizedQuarters("au 2e trimestre 2026")).toEqual(["2"]);
    expect(localizedQuarters("im 2. Quartal 2026")).toEqual(["2"]);
    expect(localizedQuarters("2026'nın 2. çeyreğinde")).toEqual(["2"]);
    expect(localizedQuarters("pada kuartal 2 2026")).toEqual(["2"]);
  });

  it("reads every quarter in a sentence that states two", () => {
    expect(
      localizedQuarters("im 2. Quartal 2026 und 29 Prozent im 2. Quartal 2025"),
    ).toEqual(["2", "2"]);
  });

  it("does not invent one from a year that happens to sit near the word", () => {
    // "2026" and "trimestre" in the same sentence, far apart: not a quarter.
    expect(
      localizedQuarters("Seis meses cerrados el 30 de junio de 2026, comparado con el trimestre"),
    ).toEqual([]);
  });

  it("finds nothing when the number itself is a word", () => {
    // Spanish is the one that genuinely spells it out, and stays unverifiable.
    expect(localizedQuarters("en el segundo trimestre de 2026")).toEqual([]);
  });
});
