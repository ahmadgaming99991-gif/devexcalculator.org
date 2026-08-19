import { ImageResponse } from "next/og";
import { getRateValue, minimumEarnedRobux } from "@/lib/calculations/rate-registry";
import { standardRateId } from "@/lib/calculations/devex";
import { formatRate, formatRobux } from "@/lib/calculations/format";
import { Rational } from "@/lib/calculations/rational";

/**
 * Open Graph image.
 *
 * Generated at build time rather than per request: `export const dynamic =
 * "force-static"` makes Next.js prerender it, which keeps the Worker off the
 * critical path for a social crawler and avoids relying on runtime
 * `ImageResponse` support under the Cloudflare adapter.
 *
 * Original artwork only — the calculation motif from the site's own logo, no
 * Roblox mark and nothing resembling its trade dress.
 */
export const runtime = "nodejs";
export const dynamic = "force-static";

export const alt =
  "DevEx Calculator: convert eligible Earned Robux into an estimated US dollar payout.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const rate = getRateValue(standardRateId);
  const example = Rational.fromInt(100_000).mul(rate);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #f6f8fc 0%, #dbe7fe 100%)",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="72" height="72" viewBox="0 0 32 32">
              <g
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21.5 L14 16.5 L18 19 L23.5 10.5" />
                <path d="M18.6 10.5 L23.5 10.5 L23.5 15.4" />
              </g>
              <circle cx="9" cy="21.5" r="2.7" fill="#ffffff" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#0b1220" }}>
            DevEx
            <span style={{ fontWeight: 500, color: "#526174" }}>Calculator</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/*
            Satori requires an explicit display on any element with more than
            one child, so each line is its own flex row rather than one block
            broken by <br />.
          */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 62,
              fontWeight: 700,
              color: "#0b1220",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            <div style={{ display: "flex" }}>Convert Earned Robux</div>
            <div style={{ display: "flex" }}>into a US dollar payout</div>
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#526174" }}>
            100,000 Earned Robux ≈ ${example.toFixed(2)} at ${formatRate(rate)} per Robux
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid #dce4ef",
            paddingTop: "28px",
            fontSize: 24,
            color: "#526174",
          }}
        >
          <div style={{ display: "flex" }}>devexcalculator.org</div>
          <div style={{ display: "flex" }}>
            {formatRobux(minimumEarnedRobux)} Robux minimum · estimates only
          </div>
        </div>
      </div>
    ),
    size,
  );
}
