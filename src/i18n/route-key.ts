/**
 * A route path as a dictionary key.
 *
 * `/` is `home`; everything else is its segments in camelCase joined by a dot,
 * so `/platform/stock/` becomes `platform.stock` and the shape of the file
 * mirrors the shape of the site. Readable in a diff, and stable: it changes
 * only when the URL does, which is exactly when a translation needs revisiting.
 *
 * Lives in `src` rather than in the extraction script because both sides need
 * it — the script writes `routes.json` with these keys and every page reads
 * its title back out with them. Two copies of this rule would drift, and the
 * symptom would be a page throwing on a key that is sitting right there under
 * a slightly different name.
 */
export function routeKey(route: string): string {
  if (route === "/") return "home";
  return route
    .replace(/^\/|\/$/g, "")
    .split("/")
    .map((segment) =>
      segment.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase()).replace(/[^a-zA-Z0-9]/g, ""),
    )
    .join(".");
}
