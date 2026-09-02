"use client";

import { useMemo, useSyncExternalStore } from "react";
import { rich } from "@/i18n/rich";
import { translatorFor, type LocaleWords } from "@/i18n/client-words";
import { Badge, Callout, Card } from "@/components/ui";
import type { Quote, QuoteState } from "@/lib/platform/market-data";

/**
 * The one moving number on `/platform/stock/`, fetched after the page loads.
 *
 * The page used to read the quote during its own server render, and that made
 * the whole document a request-time render: 884 ms of CPU on a cold request,
 * measured on the deployed Worker, for a page that is otherwise a fixed
 * explanation of where the figure comes from. The document is prerendered now
 * and this island asks `/api/stock/` for the price — the same shape
 * `/platform/` already uses for its charts, and for the same reason.
 *
 * Written as a module-level store rather than `useState` in an effect, for the
 * reason `useClientValue` gives: React 19's `set-state-in-effect` rule exists
 * to discourage the cascading render, and a shared store means one request no
 * matter how many mounts there are.
 *
 * `snapshot` is a stable reference — null until the response lands and then the
 * same object — because `useSyncExternalStore` requires one.
 *
 * Every state the server used to render is still rendered here, from the same
 * `QuoteState` union: configured or not, answered or not, current or
 * last-known. Nothing is invented when the provider is silent. What is new is
 * a loading state, which says what has not arrived yet rather than leaving a
 * gap, and a `<noscript>` beside it in the page.
 */

let snapshot: QuoteState | null = null;
let started = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Trusts nothing about the response shape; an unusable body becomes a state. */
function toState(body: unknown): QuoteState | null {
  if (typeof body !== "object" || body === null) return null;
  const data = (body as Record<string, unknown>).data;
  if (typeof data !== "object" || data === null) return null;

  const record = data as Record<string, unknown>;
  const status = record.status;

  if (status === "unconfigured") {
    const missing = record.missing;
    if (!Array.isArray(missing) || missing.some((name) => typeof name !== "string")) return null;
    return { status, missing: missing as readonly string[] };
  }

  if (status === "unavailable") {
    return typeof record.reason === "string" ? { status, reason: record.reason } : null;
  }

  if (status === "ok" || status === "last-known") {
    const raw = record.quote;
    if (typeof raw !== "object" || raw === null) return null;
    const q = raw as Record<string, unknown>;
    if (
      typeof q.symbol !== "string" ||
      typeof q.price !== "string" ||
      typeof q.currency !== "string" ||
      typeof q.asOf !== "string" ||
      typeof q.providerName !== "string"
    ) {
      return null;
    }
    const quote: Quote = {
      symbol: q.symbol,
      price: q.price,
      currency: q.currency,
      asOf: q.asOf,
      providerName: q.providerName,
    };
    if (status === "ok") return { status, quote };
    return typeof record.reason === "string" ? { status, quote, reason: record.reason } : null;
  }

  return null;
}

async function load(): Promise<void> {
  /*
   * A request that fails is a provider this page could not reach, which is a
   * state it already knows how to say. The status code goes where the
   * provider's own reason goes, so a reader is told what happened rather than
   * being shown a spinner that never resolves.
   */
  try {
    const response = await fetch("/api/stock/", { headers: { accept: "application/json" } });
    if (!response.ok) {
      snapshot = {
        status: "unavailable",
        reason: `The quote endpoint returned HTTP ${response.status}.`,
      };
    } else {
      snapshot =
        toState(await response.json()) ??
        { status: "unavailable", reason: "The quote endpoint returned an unusable body." };
    }
  } catch (error) {
    snapshot = {
      status: "unavailable",
      reason: error instanceof Error ? error.message : "The quote request did not complete.",
    };
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!started) {
    started = true;
    void load();
  }
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = (): QuoteState | null => snapshot;
/** Null on the server and during hydration, so the markup matches. */
const getServerSnapshot = (): QuoteState | null => null;

/**
 * The provider's own words, marked as the language they are in.
 *
 * `reason` is a machine diagnostic — "The provider returned HTTP 429.", a
 * network error's message — and it is English whatever language the page is
 * in. It used to be interpolated as a bare string, which put an untranslated
 * English sentence inside a translated paragraph. Marking it rather than
 * hiding it: the sentence around it explains that a newer price was refused,
 * and the reason is the evidence for that claim.
 */
function ProviderReason({ reason }: { readonly reason: string }) {
  return <span lang="en">{reason}</span>;
}

export function StockQuote({ words }: { readonly words: LocaleWords }) {
  const t = useMemo(() => translatorFor(words), [words]);
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (state === null) {
    return (
      <Callout tone="info" title={t("platform.stock.loadingTitle")}>
        {t("platform.stock.loadingBody")}
      </Callout>
    );
  }

  if (state.status === "ok" || state.status === "last-known") {
    const { quote } = state;
    const lastKnown = state.status === "last-known";
    return (
      <Card>
        <p className="text-sm text-(--color-text-muted)">{quote.symbol}</p>
        <p className="tabular mt-1 text-4xl font-bold text-(--color-text)">
          {quote.currency === "USD" ? "$" : ""}
          {quote.price}
        </p>
        <p className="mt-2 text-sm text-(--color-text-muted)">
          {quote.currency} · as of{" "}
          <time dateTime={quote.asOf}>{quote.asOf.slice(0, 16).replace("T", " ")} UTC</time>
          {t("platform.stock.body.related.p3", { providerName: quote.providerName })}
        </p>
        {lastKnown ? (
          /*
           * Shown, not hidden. The figure above is real and carries the time it
           * was taken, so it is not a stale price passed off as current — but a
           * reader is entitled to know that a newer one was asked for and
           * refused, rather than being left to infer it from the timestamp.
           */
          <p className="mt-3 text-sm text-(--color-text-muted)">
            <Badge tone="warning">{t("platform.stock.notLatestBadge")}</Badge>
            {rich(t("platform.stock.notLatestBody"), {
              reason: <ProviderReason reason={state.reason} />,
            })}
          </p>
        ) : null}
      </Card>
    );
  }

  if (state.status === "unavailable") {
    return (
      <Callout tone="warning" title={t("platform.stock.providerSilentTitle")}>
        {rich(t("platform.stock.providerSilentBody"), {
          reason: <ProviderReason reason={state.reason} />,
        })}
      </Callout>
    );
  }

  return (
    <Callout tone="info" title={t("platform.stock.noPriceConfiguredTitle")}>
      <p>{t("platform.stock.noPriceConfiguredBody")}</p>
      <p className="mt-2">
        {rich(t("platform.stock.prose.onlyConfiguration"), {
          missing: state.missing.map((name, index) => (
            <span key={name}>
              {index > 0 ? t("platform.stock.andSeparator") : ""}
              <code className="rounded bg-(--color-surface-subtle) px-1">{name}</code>
            </span>
          )),
        })}
      </p>
    </Callout>
  );
}
