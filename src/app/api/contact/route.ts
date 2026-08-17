import { NextResponse } from "next/server";
import { getContactMode, siteConfig } from "@/config/site";
import { checkRateLimit, clientKey } from "@/lib/security/rate-limit";
import { requestId } from "@/lib/security/request-id";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { escapeHtml, validateContact } from "@/lib/validation/contact";

/**
 * Contact submissions.
 *
 * Honest by construction: when no provider is configured the endpoint returns
 * 503 and says so, rather than accepting a message and silently dropping it.
 * The order of checks is deliberate — cheapest and most abusive-traffic-facing
 * first, so a flood never reaches Turnstile's API or an email provider:
 *
 *   1. Mode configured at all
 *   2. Origin matches this site
 *   3. Rate limit
 *   4. Body size and shape
 *   5. Field validation, including the honeypot
 *   6. Turnstile verification
 *   7. Delivery
 */
export const dynamic = "force-dynamic";

const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 600;
const MAX_BODY_BYTES = 16_384;

export async function GET(): Promise<NextResponse> {
  // Advertise availability without exposing which provider is configured.
  return NextResponse.json(
    { ok: true, enabled: getContactMode() !== "disabled" },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const id = requestId();
  const mode = getContactMode();

  if (mode === "disabled") {
    return json(
      {
        ok: false,
        error: {
          code: "CONTACT_DISABLED",
          message:
            "The contact form is not configured on this deployment, so nothing would be delivered.",
        },
      },
      503,
      id,
    );
  }

  // Reject a cross-origin post outright. This endpoint only ever serves this
  // site's own form, so there is no legitimate cross-origin caller.
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(siteConfig.url).host) {
        return json(
          { ok: false, error: { code: "BAD_ORIGIN", message: "Request rejected." } },
          403,
          id,
        );
      }
    } catch {
      return json(
        { ok: false, error: { code: "BAD_ORIGIN", message: "Request rejected." } },
        403,
        id,
      );
    }
  }

  const limit = checkRateLimit(clientKey(request), RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!limit.allowed) {
    return json(
      {
        ok: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many messages from this connection. Please try again later.",
        },
      },
      429,
      id,
      { "retry-after": String(limit.retryAfterSeconds) },
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BODY_BYTES) {
    return json(
      { ok: false, error: { code: "PAYLOAD_TOO_LARGE", message: "That message is too long." } },
      413,
      id,
    );
  }

  let raw: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return json(
        { ok: false, error: { code: "PAYLOAD_TOO_LARGE", message: "That message is too long." } },
        413,
        id,
      );
    }
    raw = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return json(
      { ok: false, error: { code: "INVALID_BODY", message: "The submission was malformed." } },
      400,
      id,
    );
  }

  const validation = validateContact(raw);
  if (!validation.valid) {
    return json({ ok: false, issues: validation.issues }, 422, id);
  }

  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (turnstileSecret) {
    const result = await verifyTurnstile({
      token: validation.value.turnstileToken,
      secret: turnstileSecret,
      remoteIp: request.headers.get("cf-connecting-ip"),
      expectedAction: process.env.TURNSTILE_EXPECTED_ACTION?.trim() || null,
      expectedHostname: process.env.TURNSTILE_EXPECTED_HOSTNAME?.trim() || null,
      // Stable per submission so a genuine retry is not blocked as a replay.
      idempotencyKey: id,
    });
    if (!result.success) {
      console.warn(`[contact] ${id} turnstile rejected: ${result.reason}`);
      return json(
        {
          ok: false,
          error: {
            code: "VERIFICATION_FAILED",
            message: "The anti-spam check did not pass. Please reload the page and try again.",
          },
        },
        403,
        id,
      );
    }
  } else if (mode !== "mailto") {
    // A server submission mode without Turnstile configured is a
    // misconfiguration, not something to quietly accept.
    console.error(`[contact] ${id} mode "${mode}" is enabled without TURNSTILE_SECRET_KEY`);
    return json(
      {
        ok: false,
        error: {
          code: "CONTACT_MISCONFIGURED",
          message: "The contact form is not fully configured on this deployment.",
        },
      },
      503,
      id,
    );
  }

  try {
    await deliver(mode, validation.value, id);
  } catch (error) {
    console.error(
      `[contact] ${id} delivery failed: ${error instanceof Error ? error.message : "unknown"}`,
    );
    return json(
      {
        ok: false,
        error: {
          code: "DELIVERY_FAILED",
          message: `The message could not be delivered. Please try again later and quote reference ${id}.`,
        },
      },
      502,
      id,
    );
  }

  return json({ ok: true, message: "Message received. Thank you." }, 200, id);
}

/**
 * Delivers a validated submission.
 * Message content is never written to logs — only the request id is.
 */
async function deliver(
  mode: "mailto" | "webhook" | "resend",
  input: ReturnType<typeof validateContact>["value"],
  id: string,
): Promise<void> {
  if (mode === "mailto") {
    // `mailto` is a client-side mode: the browser opens the reader's own mail
    // client and nothing is posted here. Reaching this point means the form
    // was submitted anyway, so treat it as a no-op rather than an error.
    return;
  }

  if (mode === "webhook") {
    const url = process.env.CONTACT_WEBHOOK_URL?.trim();
    if (!url) throw new Error("CONTACT_WEBHOOK_URL is not set");
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestId: id,
        name: input.name,
        email: input.email,
        subject: input.subject,
        message: input.message,
        receivedAt: new Date().toISOString(),
      }),
    });
    if (!response.ok) throw new Error(`Webhook responded with HTTP ${response.status}`);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.CONTACT_EMAIL?.trim();
  if (!apiKey || !to) throw new Error("RESEND_API_KEY or CONTACT_EMAIL is not set");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: `DevExCalculator <noreply@${siteConfig.host}>`,
      to: [to],
      reply_to: input.email,
      subject: `[Contact] ${input.subject}`,
      html: [
        `<p><strong>From:</strong> ${escapeHtml(input.name)} &lt;${escapeHtml(input.email)}&gt;</p>`,
        `<p><strong>Subject:</strong> ${escapeHtml(input.subject)}</p>`,
        `<p><strong>Reference:</strong> ${escapeHtml(id)}</p>`,
        `<hr />`,
        `<p>${escapeHtml(input.message).replace(/\n/g, "<br />")}</p>`,
      ].join(""),
    }),
  });
  if (!response.ok) throw new Error(`Resend responded with HTTP ${response.status}`);
}

function json(
  body: unknown,
  status: number,
  id: string,
  extraHeaders: Record<string, string> = {},
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store", "x-request-id": id, ...extraHeaders },
  });
}
