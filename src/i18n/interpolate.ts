/**
 * Fills `{token}` placeholders in a translated string.
 *
 * Its own module, away from `get-dictionary`, because both the server and the
 * browser need it and only the server may reach a dictionary. A Client
 * Component that imported this from `get-dictionary` would pull the loader in
 * with it, and the loader names every locale file — so the whole of every
 * language ends up in the browser bundle. That is not a hypothetical: it
 * happened, and it cost 667 kB.
 *
 * An unknown token is left visible rather than blanked. A sentence with
 * `{amount}` still in it is a bug report; a sentence with the amount silently
 * missing is a wrong figure that reads perfectly.
 */
export function interpolate(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (whole, token: string) => {
    const value = values[token];
    return value === undefined ? whole : String(value);
  });
}
