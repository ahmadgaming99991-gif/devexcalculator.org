import { ImageResponse } from "next/og";

/**
 * Apple touch icon.
 *
 * iOS ignores SVG icons, so this one PNG is generated at build time from the
 * same mark. Prerendered rather than produced per request.
 */
export const runtime = "nodejs";
export const dynamic = "force-static";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
        }}
      >
        {/*
          Drawn as SVG rather than divs. The mark is two crossing strokes and a
          dot; building that from rotated boxes would approximate it badly at
          180px, and the renderer supports inline SVG directly.
        */}
        <svg width="180" height="180" viewBox="0 0 32 32">
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
    ),
    size,
  );
}
