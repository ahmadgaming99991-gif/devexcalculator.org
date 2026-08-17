/** Normalised foreign-exchange contract shared by the provider, API and UI. */

export interface FxRates {
  /** Always "USD" — the DevEx calculation is performed in USD and converted out. */
  readonly base: string;
  /** Units of the target currency per 1 USD. */
  readonly rates: Readonly<Record<string, number>>;
  readonly provider: string;
  readonly providerUrl: string;
  /** The date the provider observed these rates, not the date we fetched them. */
  readonly observationDate: string;
  readonly fetchedAt: string;
  /**
   * True when the data is older than the provider's publication cadence, or
   * when it came from the bundled fallback snapshot. Always surfaced to the
   * reader rather than hidden.
   */
  readonly stale: boolean;
  readonly staleReason: string | null;
}

export interface FxSuccess {
  readonly ok: true;
  readonly data: FxRates;
  readonly meta: { readonly cache: "HIT" | "MISS" | "FALLBACK" };
}

export interface FxFailure {
  readonly ok: false;
  readonly error: {
    readonly code: "FX_UNAVAILABLE" | "FX_TIMEOUT" | "FX_INVALID_RESPONSE";
    readonly message: string;
  };
}

export type FxResponse = FxSuccess | FxFailure;
