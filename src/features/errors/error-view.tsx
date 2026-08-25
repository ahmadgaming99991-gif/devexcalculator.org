"use client";

import { useEffect, useMemo } from "react";
import { translatorFor, type LocaleWords } from "@/i18n/client-words";
import { rich } from "@/i18n/rich";
import { Button, ButtonLink, Container } from "@/components/ui";

/**
 * Route error boundary body.
 *
 * Shows a recoverable message and a way out. The error `digest` is a
 * server-generated identifier, safe to display and useful when someone reports
 * a problem; the underlying message and stack are never rendered.
 *
 * A Client Component because an error boundary has to be one, so its words are
 * handed to it rather than fetched — see `src/i18n/client-words.ts`.
 */
export function ErrorView({
  error,
  reset,
  words,
  home,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
  readonly words: LocaleWords;
  /** The calculator, in the locale the reader was already in. */
  readonly home: string;
}) {
  const t = useMemo(() => translatorFor(words), [words]);

  useEffect(() => {
    // Logged to the platform, not to the reader.
    console.error("Route error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <Container width="prose">
      <div className="py-8">
        <h1 className="text-2xl font-bold tracking-tight text-(--color-text)">
          {t("errors.boundary.title")}
        </h1>
        <p className="mt-3 text-(--color-text-muted)">{t("errors.boundary.body")}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={reset}>{t("errors.boundary.tryAgain")}</Button>
          <ButtonLink href={home} variant="secondary">
            {t("errors.boundary.goToCalculator")}
          </ButtonLink>
        </div>

        {error.digest ? (
          <p className="mt-6 text-sm text-(--color-text-muted)">
            {rich(t("errors.boundary.reference"), {
              digest: (
                <code className="rounded bg-(--color-surface-subtle) px-1.5 py-0.5 font-mono text-xs">
                  {error.digest}
                </code>
              ),
            })}
          </p>
        ) : null}
      </div>
    </Container>
  );
}
