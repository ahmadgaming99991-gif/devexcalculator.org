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
          background: "#2563eb",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div style={{ width: 22, height: 22, borderRadius: 11, background: "#ffffff" }} />
        <div style={{ width: 90, height: 12, borderRadius: 6, background: "#ffffff" }} />
        <div style={{ width: 22, height: 22, borderRadius: 11, background: "#ffffff" }} />
      </div>
    ),
    size,
  );
}
