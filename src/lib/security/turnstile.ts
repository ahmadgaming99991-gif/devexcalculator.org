const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Server-side Turnstile verification.
 *
 * A token that has not been redeemed against `siteverify` proves nothing — the
 * client-side widget is a convenience, not a control. Every protected
 * submission is verified here, once, before anything else happens with it.
 *
 * `idempotencyKey` matters: Cloudflare rejects a token that has already been
 * redeemed, so a legitimate retry of the same submission would otherwise fail.
 * Passing a stable key lets the same token be re-verified for one submission
 * while still blocking replay of a token across different submissions.
 */

export interface TurnstileResult {
  readonly success: boolean;
  readonly reason: string | null;
}

interface SiteverifyResponse {
  success: boolean;
  "error-codes"?: string[];
  action?: string;
  hostname?: string;
}

export async function verifyTurnstile(options: {
  token: string;
  secret: string;
  remoteIp?: string | null;
  expectedAction?: string | null;
  expectedHostname?: string | null;
  idempotencyKey?: string;
}): Promise<TurnstileResult> {
  const { token, secret, remoteIp, expectedAction, expectedHostname, idempotencyKey } = options;

  if (!token || token.length > 4096) {
    return { success: false, reason: "missing-or-oversized-token" };
  }

  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (remoteIp) body.append("remoteip", remoteIp);
  if (idempotencyKey) body.append("idempotency_key", idempotencyKey);

  let payload: SiteverifyResponse;
  try {
    const response = await fetch(SITEVERIFY_URL, { method: "POST", body });
    if (!response.ok) {
      return { success: false, reason: `siteverify-http-${response.status}` };
    }
    payload = (await response.json()) as SiteverifyResponse;
  } catch {
    // Fail closed. A verification service we cannot reach is not a pass.
    return { success: false, reason: "siteverify-unreachable" };
  }

  if (!payload.success) {
    return {
      success: false,
      reason: payload["error-codes"]?.join(",") ?? "verification-failed",
    };
  }

  // Action and hostname pinning stop a token minted for another form, or on
  // another site, from being replayed here.
  if (expectedAction && payload.action !== expectedAction) {
    return { success: false, reason: "action-mismatch" };
  }
  if (expectedHostname && payload.hostname !== expectedHostname) {
    return { success: false, reason: "hostname-mismatch" };
  }

  return { success: true, reason: null };
}
