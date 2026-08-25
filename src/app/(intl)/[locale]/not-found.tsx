import { NotFoundBody } from "@/views/not-found-body";

/**
 * The 404 for an unknown page under a language prefix.
 *
 * Without this file, `/de/nope/` fell through to the root `not-found.tsx` —
 * which renders its own document — while the localized root layout was still
 * rendering one around it. Two `<html>` elements in one response, and the
 * second one discarded by the browser along with whatever was inside it.
 *
 * Here, the localized layout has already run: `<html lang="de">` is set, the
 * header and footer are German, and only the message is left to render. The
 * body reads the locale from the document rather than being passed it, because
 * a `not-found.tsx` receives no params.
 */
export default function LocalizedNotFoundPage() {
  return <NotFoundBody />;
}
