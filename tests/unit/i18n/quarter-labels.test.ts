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

  it("reads the number when the language writes it as a word", () => {
    // Spanish is the one that spells it out. *Segundo* means two the way *dos*
    // means two: a closed list of four words, not a judgment about phrasing.
    expect(localizedQuarters("en el segundo trimestre de 2026")).toEqual(["2"]);
    expect(localizedQuarters("no terceiro trimestre de 2025")).toEqual(["3"]);
    expect(localizedQuarters("au deuxième trimestre 2026")).toEqual(["2"]);
    expect(localizedQuarters("im vierten Quartal 2025")).toEqual(["4"]);
    expect(localizedQuarters("pada kuartal kedua 2026")).toEqual(["2"]);
    expect(localizedQuarters("2026'nın ikinci çeyreğinde")).toEqual(["2"]);
  });

  /**
   * The point of reading the word form at all.
   *
   * Clearing three correct Spanish sentences by waiving the finding would leave
   * the sensor off: a later `tercer trimestre` where English says `Q2` would be
   * filed as unverifiable prose and gate nothing. It has to come back as a
   * different number, not as an absence.
   */
  it("reports a different quarter when the word form states one", () => {
    expect(localizedQuarters("en el tercer trimestre de 2026")).toEqual(["3"]);
    expect(localizedQuarters("en el primer trimestre de 2026")).toEqual(["1"]);
  });

  it("does not read the German noun for a quarter as an ordinal", () => {
    // `Quartal` begins with the Portuguese ordinal *quarta*. Every alternative
    // ends at a non-letter, which is what keeps the two apart.
    expect(localizedQuarters("Erstellen Sie ein Quartal")).toEqual([]);
    expect(localizedQuarters("im 2. Quartal 2026")).toEqual(["2"]);
  });
});
