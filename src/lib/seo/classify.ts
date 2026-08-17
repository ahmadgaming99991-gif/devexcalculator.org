import {
  classificationKey,
  comparisonKey,
  extractAmount,
  extractCurrency,
  hasNonLatinScript,
} from "./normalize";

/**
 * Deterministic, rule-based intent classification and route ownership.
 *
 * Rules run in a fixed order and the first match wins, so the outcome for any
 * keyword is reproducible and explainable. Nothing here is statistical: an
 * automated guess that cannot be justified belongs in `ambiguous-review`, not
 * in a published route.
 */

export type PrimaryIntent =
  | "core-devex-calculator"
  | "devex-rate"
  | "devex-rate-history"
  | "us-18-plus-rate"
  | "generic-robux-to-usd"
  | "reverse-usd-to-robux"
  | "numeric-amount-conversion"
  | "local-currency-conversion"
  | "earned-robux-definition"
  | "devex-eligibility"
  | "cash-out-process"
  | "fees-payment"
  | "taxes"
  | "marketplace-tax"
  | "calculator-comparison"
  | "brand-navigational"
  | "informational-definition"
  | "troubleshooting"
  | "off-topic"
  | "ambiguous-review";

export type KeywordStatus = "included" | "excluded" | "ambiguous-review" | "duplicate-variant";

export type ExclusionReason =
  | "competitor-brand-navigational"
  | "intent-mismatch"
  | "out-of-product-scope"
  | "non-latin-locale-unsupported"
  | "purchase-price-not-sourceable"
  | "too-vague-to-serve";

export interface Classification {
  readonly primaryIntent: PrimaryIntent;
  readonly secondaryIntents: readonly string[];
  readonly status: KeywordStatus;
  readonly exclusionReason: ExclusionReason | null;
  readonly rationale: string;
  /** 0–1. Below 0.6 the keyword is routed to manual review. */
  readonly confidence: number;
}

interface Rule {
  readonly id: string;
  readonly test: (key: string) => boolean;
  readonly result: (key: string) => Classification;
}

const has = (key: string, ...tokens: string[]): boolean =>
  tokens.some((token) => new RegExp(`(^| )${token}( |$)`).test(key));

const contains = (key: string, ...fragments: string[]): boolean =>
  fragments.some((fragment) => key.includes(fragment));

/** DevEx spelling variants, all of which mean the Developer Exchange programme. */
const DEVEX = /\bdevex\b|\bdev ex\b|\bdev x\b|\bdevx\b|\bdeveloper exchange\b|\bdev exchange\b|\bdevexchange\b|\bdevelopper exchange\b/;

const CALCULATOR = /\bcalculator\b|\bcalc\b|\bcalculater\b|\bconverter\b|\bconvertor\b|\bconvert\b|\bconversion\b|\btranslator\b/;

function classification(
  primaryIntent: PrimaryIntent,
  rationale: string,
  options: {
    secondary?: readonly string[];
    status?: KeywordStatus;
    exclusionReason?: ExclusionReason | null;
    confidence?: number;
  } = {},
): Classification {
  return {
    primaryIntent,
    secondaryIntents: options.secondary ?? [],
    status: options.status ?? "included",
    exclusionReason: options.exclusionReason ?? null,
    rationale,
    confidence: options.confidence ?? 0.9,
  };
}

/**
 * Ordered classification rules. Order encodes precedence: a keyword naming a
 * competitor brand is excluded before anything else can claim it, and an
 * explicit DevEx signal outranks a generic conversion signal.
 */
const RULES: readonly Rule[] = [
  // -- Exclusions first -----------------------------------------------------
  {
    id: "non-latin-script",
    test: (key) => hasNonLatinScript(key),
    result: () =>
      classification("off-topic", "Non-Latin query requiring native localisation the site does not offer at launch.", {
        status: "excluded",
        exclusionReason: "non-latin-locale-unsupported",
        confidence: 0.95,
      }),
  },
  {
    id: "competitor-brand",
    test: (key) =>
      /\brbx ?tax\b|\brbx ?calc\b|\bromonitor\b|\btoolblx\b|\bdevexcalc\b|\bdevexconverter\b/.test(key),
    result: () =>
      classification("brand-navigational", "Navigational query for a competitor brand; not ours to target.", {
        status: "excluded",
        exclusionReason: "competitor-brand-navigational",
        confidence: 0.98,
      }),
  },
  {
    id: "unrelated-roblox-tool",
    test: (key) => /\bvisits? to robux\b|\bgroup funds? calculator\b|\bpremium payout\b/.test(key),
    result: () =>
      classification("off-topic", "A different Roblox creator tool that this site does not build.", {
        status: "excluded",
        exclusionReason: "out-of-product-scope",
        confidence: 0.9,
      }),
  },
  {
    id: "too-vague",
    test: (key) => key === "robux to" || key === "devex" || key.split(" ").length === 1,
    result: (key) =>
      key === "devex" || key === "devexchange"
        ? classification("informational-definition", "Bare programme name; served by the homepage definition block.", {
            secondary: ["core-devex-calculator"],
            confidence: 0.7,
          })
        : classification("ambiguous-review", "Truncated or single-token query with no resolvable task.", {
            status: "ambiguous-review",
            confidence: 0.3,
          }),
  },

  // -- Marketplace fee ("Roblox tax") --------------------------------------
  {
    id: "marketplace-tax",
    test: (key) => /\btax\b/.test(key) && !DEVEX.test(key),
    result: () =>
      classification("marketplace-tax", "Roblox marketplace fee intent, a distinct product from DevEx.", {
        secondary: ["fees-payment"],
        confidence: 0.85,
      }),
  },

  // -- Eligibility, process and definitions --------------------------------
  {
    id: "eligibility",
    test: (key) =>
      /\bminimum\b|\brequirements?\b|\beligib|\bqualify\b|\bhow to (?:get|join|apply for) devex\b|\bdevex requirements?\b/.test(
        key,
      ),
    result: () =>
      classification("devex-eligibility", "Eligibility, minimum or requirements intent.", {
        confidence: 0.9,
      }),
  },
  {
    id: "earned-robux",
    test: (key) => /\bearned robux\b|\bpending robux\b|\bqualif\w* robux\b/.test(key),
    result: () =>
      classification("earned-robux-definition", "Definition of which Robux qualify for DevEx.", {
        confidence: 0.9,
      }),
  },
  {
    id: "cash-out",
    test: (key) =>
      /\bcash ?out\b|\bsell robux\b|\bwithdraw\b|\bpayout process\b|\bturn robux into money\b|\bhow to convert robux\b|\bhow do i convert robux\b/.test(
        key,
      ),
    result: () =>
      classification("cash-out-process", "Process intent: how a creator actually converts Robux to cash.", {
        secondary: ["core-devex-calculator"],
        confidence: 0.85,
      }),
  },
  {
    id: "rate-history",
    // A four-digit number is only a year if it is not the amount being asked
    // about. Without this guard "how much is 2000 robux in dollars" is read as
    // a query about the year 2000.
    test: (key) =>
      /\bold rate\b|\blegacy\b|\brate (?:change|history)\b/.test(key) ||
      (/\b(?:19|20)\d{2}\b/.test(key) && extractAmount(key) === null),
    result: () =>
      classification("devex-rate-history", "Historic or dated rate intent.", {
        secondary: ["devex-rate"],
        confidence: 0.8,
      }),
  },
  {
    id: "us-18-plus",
    test: (key) => /\b18\+?\b.*\brate\b|\bus 18\b|\bage verified rate\b/.test(key),
    result: () =>
      classification("us-18-plus-rate", "Conditional United States 18+ rate intent.", {
        secondary: ["devex-rate"],
        confidence: 0.85,
      }),
  },
  {
    id: "fees",
    test: (key) => /\bfees?\b|\bpaypal\b|\btipalti\b|\bpayment (?:method|provider)\b/.test(key),
    result: () =>
      classification("fees-payment", "Payment or fee intent surrounding a DevEx payout.", {
        confidence: 0.8,
      }),
  },

  // -- Rates ----------------------------------------------------------------
  {
    id: "devex-rate",
    test: (key) =>
      (DEVEX.test(key) && /\brates?\b|\bexchange rate\b|\bprices?\b|\bratio\b/.test(key)) ||
      /\brobux (?:conversion|exchange) rate\b|\brobux to (?:usd|money|dollar) (?:conversion )?rate\b|\broblox (?:conversion|exchange) rate\b|\brobux to dollar ratio\b/.test(
        key,
      ),
    result: () =>
      classification("devex-rate", "Current rate intent, owned by the rates page.", {
        secondary: ["core-devex-calculator"],
        confidence: 0.9,
      }),
  },

  // -- Reverse direction ----------------------------------------------------
  {
    id: "reverse",
    test: (key) =>
      /\busd to robux\b|\bdollars? to robux\b|\bmoney (?:to|into) robux\b|\bmoney to robux\b/.test(key),
    result: () =>
      classification("reverse-usd-to-robux", "Reverse direction: from a cash figure back to Robux.", {
        secondary: ["numeric-amount-conversion"],
        confidence: 0.9,
      }),
  },

  // -- Core DevEx calculator ------------------------------------------------
  {
    id: "devex-calculator",
    test: (key) => DEVEX.test(key) && (CALCULATOR.test(key) || /\bto usd\b|\brobux\b|\broblox\b/.test(key)),
    result: () =>
      classification("core-devex-calculator", "Explicit DevEx calculator or DevEx conversion intent.", {
        secondary: ["generic-robux-to-usd"],
        confidence: 0.95,
      }),
  },
  {
    id: "devex-informational",
    test: (key) => DEVEX.test(key),
    result: () =>
      classification("informational-definition", "DevEx programme intent without an explicit tool signal.", {
        secondary: ["core-devex-calculator"],
        confidence: 0.75,
      }),
  },

  // -- Numeric amounts ------------------------------------------------------
  {
    id: "numeric-amount",
    test: (key) => extractAmount(key) !== null,
    result: (key) => {
      const currency = extractCurrency(key);
      const isLocal = currency !== null && currency !== "USD";
      return classification(
        isLocal ? "local-currency-conversion" : "numeric-amount-conversion",
        isLocal
          ? `Specific amount converted to ${currency}, served by the local-currency layer of the conversion hub.`
          : "Specific Robux amount converted to USD.",
        { secondary: ["generic-robux-to-usd"], confidence: 0.9 },
      );
    },
  },

  // -- Generic conversion ---------------------------------------------------
  {
    id: "purchase-price",
    test: (key) => /\b(?:cost|price|buy|purchase)\b/.test(key) && /\brobux\b/.test(key),
    result: () =>
      classification("generic-robux-to-usd", "Purchase-price intent, answered by the comparison section rather than a fabricated universal rate.", {
        secondary: ["informational-definition"],
        confidence: 0.7,
      }),
  },
  {
    id: "generic-conversion",
    test: (key) =>
      /\brobux\b/.test(key) &&
      (/\busd\b|\bmoney\b|\bdollars?\b|\bcurrency\b/.test(key) || CALCULATOR.test(key)),
    result: (key) => {
      const currency = extractCurrency(key);
      const isLocal = currency !== null && currency !== "USD";
      return classification(
        isLocal ? "local-currency-conversion" : "generic-robux-to-usd",
        isLocal
          ? `Generic conversion naming ${currency}.`
          : "Generic Robux-to-USD conversion or calculator intent.",
        { secondary: ["core-devex-calculator"], confidence: 0.85 },
      );
    },
  },
  {
    id: "roblox-generic-conversion",
    test: (key) => /\broblox\b/.test(key) && /\busd\b|\bmoney\b|\bdollars?\b|\bcurrency\b/.test(key),
    result: () =>
      classification("generic-robux-to-usd", "Roblox currency conversion phrased without the word Robux.", {
        confidence: 0.75,
      }),
  },
  {
    // "robux exchange", "roblox calculator", "robux converter" name the tool
    // without naming the output currency. The conversion page is still the
    // best answer; there is nothing genuinely ambiguous about them.
    id: "tool-without-currency",
    test: (key) =>
      (/\brobux\b|\broblox\b/.test(key) && CALCULATOR.test(key)) ||
      (/\brobux\b|\broblox\b/.test(key) && /\bexchange\b|\bvalue\b|\bworth\b|\bratio\b/.test(key)),
    result: () =>
      classification("generic-robux-to-usd", "Names the conversion tool without naming a target currency; the converter page answers it.", {
        secondary: ["core-devex-calculator"],
        confidence: 0.7,
      }),
  },
  {
    id: "calculator-comparison",
    test: (key) => /\bbest\b|\bvs\b|\balternative\b|\breview\b/.test(key),
    result: () =>
      classification("calculator-comparison", "Comparison or alternative-seeking intent.", {
        status: "ambiguous-review",
        confidence: 0.5,
      }),
  },
];

/**
 * Rules that must see the literal query, before any spelling folding.
 *
 * A brand name is a literal string. Folding `rbx` to `robux` first would turn
 * the competitor brand `rbx tax` into the ordinary product query `robux tax`
 * and quietly target someone else's brand.
 */
const LITERAL_RULE_IDS = new Set(["non-latin-script", "competitor-brand"]);

/** Classifies a raw keyword. */
export function classifyKeyword(raw: string): Classification {
  const literalKey = comparisonKey(raw);
  // Spelling variants are folded so misspellings and spacing variants reach
  // the same rule as their canonical form.
  const key = classificationKey(raw);

  for (const rule of RULES) {
    const subject = LITERAL_RULE_IDS.has(rule.id) ? literalKey : key;
    if (rule.test(subject)) {
      return rule.result(subject);
    }
  }

  return classification("ambiguous-review", "No deterministic rule matched; needs a manual decision.", {
    status: "ambiguous-review",
    confidence: 0.2,
  });
}

// ---------------------------------------------------------------------------
// Route ownership
// ---------------------------------------------------------------------------

export const ROUTES = {
  home: "/",
  robuxToUsd: "/robux-to-usd/",
  usdToRobux: "/usd-to-robux/",
  devexRates: "/devex-rates/",
  devexRateHistory: "/devex-rate-history/",
  devexRequirements: "/devex-requirements/",
  earnedRobux: "/earned-robux/",
  howToCashOut: "/how-to-cash-out-robux/",
  feesAndTaxes: "/devex-fees-and-taxes/",
  robuxTaxCalculator: "/robux-tax-calculator/",
  conversions: "/conversions/",
  calculators: "/calculators/",
} as const;

/**
 * One canonical route per intent. A route may own many keywords; a keyword
 * must never have two owners. The cannibalisation validator enforces that.
 */
const INTENT_ROUTES: Readonly<Record<PrimaryIntent, string | null>> = {
  "core-devex-calculator": ROUTES.home,
  "informational-definition": ROUTES.home,
  "devex-rate": ROUTES.devexRates,
  "devex-rate-history": ROUTES.devexRateHistory,
  "us-18-plus-rate": ROUTES.devexRates,
  "generic-robux-to-usd": ROUTES.robuxToUsd,
  "reverse-usd-to-robux": ROUTES.usdToRobux,
  "numeric-amount-conversion": ROUTES.conversions,
  "local-currency-conversion": ROUTES.conversions,
  "earned-robux-definition": ROUTES.earnedRobux,
  "devex-eligibility": ROUTES.devexRequirements,
  "cash-out-process": ROUTES.howToCashOut,
  "fees-payment": ROUTES.feesAndTaxes,
  taxes: ROUTES.feesAndTaxes,
  "marketplace-tax": ROUTES.robuxTaxCalculator,
  "calculator-comparison": ROUTES.calculators,
  "brand-navigational": null,
  troubleshooting: null,
  "off-topic": null,
  "ambiguous-review": null,
};

export interface RouteAssignment {
  readonly targetRoute: string | null;
  /** Where the keyword is served when it has no standalone page of its own. */
  readonly fallbackRoute: string | null;
  readonly targetSection: string | null;
  readonly canonicalOwner: boolean;
}

/** Maps a classification (plus any amount) onto its canonical route. */
export function assignRoute(
  classification: Classification,
  amount: number | null,
): RouteAssignment {
  const base = INTENT_ROUTES[classification.primaryIntent];

  if (classification.status !== "included" || base === null) {
    return {
      targetRoute: null,
      fallbackRoute: null,
      targetSection: null,
      canonicalOwner: false,
    };
  }

  // A specific amount resolves to the conversion hub, with the calculator's
  // query-parameter state as the fallback. Whether it also earns a standalone
  // page is decided later by the publish gate, never automatically.
  if (amount !== null && base === ROUTES.conversions) {
    return {
      targetRoute: ROUTES.conversions,
      fallbackRoute: `${ROUTES.robuxToUsd}?robux=${amount}`,
      targetSection: "popular-amounts",
      canonicalOwner: false,
    };
  }

  return {
    targetRoute: base,
    fallbackRoute: null,
    targetSection: sectionFor(classification.primaryIntent),
    canonicalOwner: true,
  };
}

function sectionFor(intent: PrimaryIntent): string | null {
  switch (intent) {
    case "core-devex-calculator":
      return "calculator";
    case "informational-definition":
      return "what-is-devex";
    case "devex-rate":
    case "us-18-plus-rate":
      return "current-rates";
    case "devex-rate-history":
      return "timeline";
    case "generic-robux-to-usd":
      return "converter";
    case "reverse-usd-to-robux":
      return "target-calculator";
    case "earned-robux-definition":
      return "definition";
    case "devex-eligibility":
      return "requirements";
    case "cash-out-process":
      return "process";
    case "fees-payment":
    case "taxes":
      return "fees";
    case "marketplace-tax":
      return "calculator";
    default:
      return null;
  }
}
