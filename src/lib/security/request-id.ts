/**
 * Correlation ids for server logs.
 *
 * A public error response carries an id and nothing else; the detail goes to
 * the log. That way a reader can quote an id when reporting a problem without
 * the response ever leaking a stack trace, an upstream URL or a secret.
 */
export function requestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
