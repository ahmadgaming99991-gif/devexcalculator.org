import { ImageResponse } from "next/og";

/**
 * Apple touch icon.
 *
 * iOS ignores SVG icons, so this one PNG is generated at build time from the
 * same simplified mark the tab icon uses — the hexagon and the dollar sign, in
 * the brand's green. The full artwork is not downscaled into it: at icon sizes
 * the calculator keys and the circling arrows merge into a smudge, and iOS
 * rounds the corners itself, which would eat the hexagon's points.
 *
 * Prerendered rather than produced per request.
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
          background: "linear-gradient(135deg, #8bf60c 0%, #3fd40d 55%, #15980a 100%)",
        }}
      >
        {/*
          Drawn as SVG rather than divs. A dollar sign is two curves and a bar;
          approximating that with rotated boxes at 180px would look like an
          accident, and the renderer supports inline SVG directly.

          The hexagon is left to the tile: iOS masks the corners of the icon it
          is given, so a hexagon inside would be clipped at exactly the points
          that make it recognisable.
        */}
        <svg width="112" height="112" viewBox="0 0 32 32">
          <g stroke="#0d1717" strokeWidth="3.1" strokeLinecap="round" fill="none">
            <path d="M16 7.6 V24.4" />
            <path d="M20.2 12.1 C20.2 10 18.3 9.1 16 9.1 C13.7 9.1 11.8 10.1 11.8 12.1 C11.8 16 20.2 14.9 20.2 18.9 C20.2 21.1 18.3 22.9 16 22.9 C13.7 22.9 11.8 21.7 11.8 19.8" />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
