import { describe, expect, it } from "vitest";
import {
  amountEntityId,
  amountSlug,
  classificationKey,
  comparisonKey,
  extractAmount,
  extractCurrency,
  extractEntities,
  hasNonLatinScript,
  normalizeKeyword,
  spellingFamily,
} from "@/lib/seo/normalize";

describe("normalizeKeyword", () => {
  it("collapses whitespace runs and trims", () => {
    expect(normalizeKeyword("  robux   to    usd  ")).toBe("robux to usd");
  });

  it("normalises typographic punctuation", () => {
    expect(normalizeKeyword("robux’s value")).toBe("robux's value");
    expect(normalizeKeyword("robux — usd")).toBe("robux - usd");
  });

  it("removes zero-width characters", () => {
    expect(normalizeKeyword("robux​to​usd")).toBe("robuxtousd");
  });

  it("preserves the original casing", () => {
    expect(normalizeKeyword("DevEx Calculator")).toBe("DevEx Calculator");
  });
});

describe("comparisonKey", () => {
  it("lowercases and strips trailing punctuation", () => {
    expect(comparisonKey("How much is 1000 Robux?")).toBe("how much is 1000 robux");
  });
});

describe("classificationKey", () => {
  it("folds Robux misspellings to one form", () => {
    for (const variant of ["robus to usd", "rubux to usd", "robix to usd", "robucks to usd"]) {
      expect(classificationKey(variant)).toBe("robux to usd");
    }
  });

  it("folds DevEx spacing and spelling variants", () => {
    for (const variant of [
      "dev ex calculator",
      "dev x calculator",
      "devx calculator",
      "devexchange calculator",
      "developer exchange calculator",
    ]) {
      expect(classificationKey(variant)).toContain("devex");
    }
  });

  it("folds a bare dollar sign to usd", () => {
    expect(classificationKey("robux to $")).toBe("robux to usd");
  });

  it("folds calculator and converter spelling variants", () => {
    expect(classificationKey("robux calculater")).toBe("robux calculator");
    expect(classificationKey("robux convertor")).toBe("robux converter");
    expect(classificationKey("devex calc")).toBe("devex calculator");
  });

  it("keeps different directions apart", () => {
    expect(classificationKey("robux to usd")).not.toBe(classificationKey("usd to robux"));
  });
});

describe("spellingFamily", () => {
  it("groups DevEx calculator variants into one family", () => {
    const family = spellingFamily("devex calculator");
    for (const variant of [
      "dev ex calculator",
      "dev x calculator",
      "roblox devex calculator",
      "devex calc",
      "devex calculator roblox",
    ]) {
      expect(spellingFamily(variant)).toBe(family);
    }
  });

  it("groups amount variants of one question into a single family", () => {
    const family = spellingFamily("100,000 robux to usd");
    for (const variant of ["100000 robux to usd", "100 000 robux to usd", "100k robux to usd"]) {
      expect(spellingFamily(variant)).toBe(family);
    }
  });

  it("does not merge different search tasks", () => {
    expect(spellingFamily("robux to usd")).not.toBe(spellingFamily("usd to robux"));
  });
});

describe("extractAmount", () => {
  it.each([
    ["1000 robux to usd", 1_000],
    ["100,000 robux to usd", 100_000],
    ["100 000 robux to usd", 100_000],
    ["100k robux to usd", 100_000],
    ["1 million robux to usd", 1_000_000],
    ["1.5 million robux to usd", 1_500_000],
    ["10m robux to usd", 10_000_000],
    ["1mil robux to usd", 1_000_000],
    ["1 billion robux to usd", 1_000_000_000],
    ["3.6 billion robux to usd", 3_600_000_000],
    ["how much is 17k robux in usd", 17_000],
    ["how much money is 48000 robux", 48_000],
    ["2500 robux to usd", 2_500],
  ])("extracts %s as %i", (keyword, expected) => {
    expect(extractAmount(keyword)?.amount).toBe(expected);
  });

  it("maps every formatting variant of one amount to a single entity", () => {
    const ids = ["100000 robux to usd", "100,000 robux to usd", "100 000 robux to usd", "100k robux to usd"].map(
      (k) => extractAmount(k)?.entityId,
    );
    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).toBe("robux-100000");
  });

  it("does not mistake a year for an amount", () => {
    expect(extractAmount("roblox devex rates 2023")).toBeNull();
    expect(extractAmount("devex rate 2024")).toBeNull();
  });

  it("returns null when no amount is named", () => {
    expect(extractAmount("robux to usd")).toBeNull();
    expect(extractAmount("devex calculator")).toBeNull();
  });

  it("extracts an amount from a misspelled Robux word", () => {
    expect(extractAmount("10000 robux to dollars")?.amount).toBe(10_000);
    expect(extractAmount("5000 robucks to usd")?.amount).toBe(5_000);
  });

  it("rejects a fractional Robux amount", () => {
    expect(extractAmount("2.5 robux to usd")).toBeNull();
  });

  it("builds stable entity ids and slugs", () => {
    expect(amountEntityId(100_000)).toBe("robux-100000");
    expect(amountSlug(100_000)).toBe("100000-robux-to-usd");
  });
});

describe("extractCurrency", () => {
  it.each([
    ["1 million robux in pounds", "GBP"],
    ["3000 robux to cad", "CAD"],
    ["1 robux to aud", "AUD"],
    ["17000 robux berapa rupiah", "IDR"],
    ["how much is 1000 robux in philippines pesos", "PHP"],
    ["robux to usd", "USD"],
  ])("detects the currency in %s", (keyword, expected) => {
    expect(extractCurrency(keyword)).toBe(expected);
  });

  it("returns null when no currency is named", () => {
    expect(extractCurrency("devex calculator")).toBeNull();
  });
});

describe("extractEntities", () => {
  it("identifies the entities a keyword references", () => {
    const entities = extractEntities("roblox devex calculator");
    expect(entities).toContain("Roblox");
    expect(entities).toContain("Developer Exchange Program");
  });

  it("returns an empty list for an unrelated keyword", () => {
    expect(extractEntities("weather today")).toEqual([]);
  });
});

describe("hasNonLatinScript", () => {
  it("detects a non-Latin query", () => {
    expect(hasNonLatinScript("roblox幣值")).toBe(true);
  });

  it("accepts ordinary Latin queries including punctuation and digits", () => {
    expect(hasNonLatinScript("100,000 robux to usd")).toBe(false);
    expect(hasNonLatinScript("robux to $")).toBe(false);
  });
});
