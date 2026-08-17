# Calculation methodology

The engine is `src/lib/calculations/`. It is framework-independent, pure, and
covered by the tests in `tests/unit/calculations/`. No React component performs
arithmetic; every figure the site displays comes from these functions.

## Why exact arithmetic

`0.0038` cannot be represented in binary floating point. The error is not
theoretical at the amounts this site handles:

```js
17000 * 0.0054   // 91.80000000000001, not 91.80
```

17,000 Robux is a real query in the supplied keyword data. Across a chain of
rate, fee and tax operations the drift compounds, and it is the kind of error
that survives review because every individual figure looks plausible.

Every money value is held as `Rational` — a pair of `bigint` values forming an
exact fraction — from the moment a rate is read until the moment a figure is
printed. Addition, subtraction, multiplication and division are exact
throughout. Nothing is rounded partway, so a displayed total always equals the
sum of the parts shown above it.

Robux counts are `bigint` for the same reason: a balance in the billions stays
exact rather than losing its low digits to double precision.

Rates are stored as **strings** in `src/data/rates.json`. A JSON number would be
parsed as a double and lose exactness before the engine ever saw it. The schema
enforces this.

## Formulas

```text
grossUsd            = eligibleEarnedRobux × usdPerRobux

standardUsd         = standardRobux × 0.0038
legacyUsd           = legacyRobux   × 0.0035
us18Usd             = us18Robux     × 0.0054
grossUsd            = standardUsd + legacyUsd + us18Usd

blendedRate         = grossUsd ÷ totalRobux

percentageFeeUsd    = grossUsd × feePercent ÷ 100
netBeforeTaxUsd     = max(0, grossUsd − percentageFeeUsd − flatFeeUsd)
estimatedTaxUsd     = max(0, netBeforeTaxUsd × taxPercent ÷ 100)
netAfterEstimateUsd = max(0, netBeforeTaxUsd − estimatedTaxUsd)

requiredRobux       = ceil(targetUsd ÷ usdPerRobux)

localValue          = usdValue × (eurToTarget ÷ eurToUsd)

creatorRobux        = floor(grossRobux × creatorShare ÷ 100)
requiredGrossRobux  = ceil(targetNetRobux × 100 ÷ creatorShare)
```

## Double counting

The split calculator takes three separate inputs, one per rate bucket. There is
no code path that applies more than one rate to the same input, so the same
Robux cannot be counted twice.

What the engine cannot do is discover the real split — Roblox's internal
accounting of when each Robux was earned is not visible from outside. The
calculator models whatever division the user supplies, and the interface says
so.

## Rounding

Precision is dropped exactly once, at the display boundary, and the direction is
chosen deliberately in each case.

| Value | Direction | Reason |
|---|---|---|
| Money | Half-up, to the currency's minor units | Conventional; 2 places for USD, 0 for JPY, KRW, ISK |
| Required Robux | **Up** | Rounding to nearest would sometimes return a figure that falls short of the requested target |
| Marketplace creator share | **Down** | Better to under-promise than to show a figure a Robux above what arrives |
| Percentages | Half-up, to the requested places | Display only; never fed back into arithmetic |
| Intermediate values | **Never rounded** | Rounding a subtotal would let a total disagree with its own breakdown |

`Intl.NumberFormat` handles grouping and symbols, taking a decimal string that
has already been rounded exactly — not a float.

## Rate registry

`src/data/rates.json` is validated when the module loads, which means during
`next build`. An invalid registry fails the build rather than shipping. The
checks:

- Every rate value is a positive exact decimal string.
- `usdPerThousandRobux` equals `usdPerRobux × 1000` exactly.
- Every rate cites at least one source that resolves in the source registry.
- Every rate carries a `lastVerifiedAt`.
- Effective dates do not conflict.
- Exactly one rate is `active`.
- No duplicate rate or scheme ids.
- Progressive marketplace tiers are sorted by increasing price-floor multiple.
- The input cap is labelled an application limit, not a Roblox limit.

## Verified figures

Checked against the Roblox Creator Hub on 2026-08-17 and pinned by tests:

| Amount | Standard 0.0038 | Legacy 0.0035 | U.S. 18+ 0.0054 |
|---|---|---|---|
| 1,000 | $3.80 | $3.50 | $5.40 |
| 30,000 | **$114.00** | **$105.00** | $162.00 |
| 100,000 | $380.00 | $350.00 | $540.00 |
| 1,000,000 | $3,800.00 | $3,500.00 | $5,400.00 |

The two bold figures are stated verbatim by Roblox, which makes them the anchor
the whole registry is checked against.

## Foreign exchange

The DevEx rate is denominated in USD, so every calculation happens in USD and
converts afterwards. The ECB publishes euro-based reference rates, so a USD
cross rate is derived:

```text
USD → X  =  (EUR → X) ÷ (EUR → USD)
```

Inverting that division produces plausible-looking numbers wrong by the square
of the rate. The direction is pinned by fixtures in `tests/integration/fx.test.ts`
against a captured real ECB response, including sanity checks that one dollar
buys less than one pound and more than fifty yen.

A currency whose latest observation predates the USD one has been discontinued
by the ECB and is excluded — this is what removed BGN (decision D-006).

Reference rates are not tradable quotes. Every converted figure displays the
provider and observation date and says a bank will apply its own rate.

## Limits

`maxRobuxInput` is 100,000,000,000 and `maxUsdTargetInput` is 1,000,000,000.
These are application safety limits chosen here to keep arithmetic and rendering
bounded. They are **not** Roblox limits, the registry note says so, and the
error message a user sees says so too.

## What the engine cannot determine

- Which Robux Roblox counts as Earned Robux.
- How a balance divides across the three rates.
- Whether a request will be approved, or when it will pay.
- What a payment provider will charge.
- What tax is owed.

Each is stated on the pages where a reader might otherwise assume otherwise.
