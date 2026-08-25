"use client";

import { ErrorView } from "@/features/errors/error-view";
import { EN_ERROR_WORDS } from "./error-words";

/**
 * Route error boundary.
 *
 * An error boundary has to be a Client Component, and a Client Component
 * cannot await a dictionary — so its words are compiled in rather than
 * fetched. English, for the same reason `not-found.tsx` is: this file is
 * rendered without params and cannot know which language it interrupted.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorView error={error} reset={reset} words={EN_ERROR_WORDS} home="/" />;
}
