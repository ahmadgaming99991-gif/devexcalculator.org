"use client";

import { useEffect } from "react";
import { Button, ButtonLink, Container } from "@/components/ui";

/**
 * Route error boundary.
 *
 * Shows a recoverable message and a way out. The error `digest` is a
 * server-generated identifier, safe to display and useful when someone reports
 * a problem; the underlying message and stack are never rendered.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logged to the platform, not to the reader.
    console.error("Route error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <Container width="prose">
      <div className="py-8">
        <h1 className="text-2xl font-bold tracking-tight text-[--color-text]">
          Something went wrong on this page
        </h1>
        <p className="mt-3 text-[--color-text-muted]">
          The calculator itself is unaffected — calculations run in your browser
          and do not depend on this page loading. Try again, or go straight to
          the calculator.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/" variant="secondary">
            Go to the calculator
          </ButtonLink>
        </div>

        {error.digest ? (
          <p className="mt-6 text-sm text-[--color-text-muted]">
            If you report this, quote reference{" "}
            <code className="rounded bg-[--color-surface-subtle] px-1.5 py-0.5 font-mono text-xs">
              {error.digest}
            </code>
            .
          </p>
        ) : null}
      </div>
    </Container>
  );
}
