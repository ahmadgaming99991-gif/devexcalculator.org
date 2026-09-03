import { ImageResponse } from "next/og";

/**
 * The shared Open Graph card.
 *
 * Every route used to share one image, so a link to a page about 500,000 Robux
 * and a link to the eligibility rules arrived in a chat looking identical —
 * and the figure each page exists to state was the one thing the preview did
 * not carry.
 *
 * One template rather than a drawing per route. The layout, the mark and the
 * footer are fixed; a route supplies only the words. That keeps thirty-six
 * cards recognisably the same site, and means a change to the frame is one
 * edit rather than a sweep.
 *
 * Generated at build time — every caller sets `dynamic = "force-static"` — so a
 * social crawler never reaches the Worker, and nothing here depends on runtime
 * `ImageResponse` support under the Cloudflare adapter.
 *
 * Original artwork only: the site's own mark, no Roblox mark and nothing
 * resembling its trade dress.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

export interface OgCard {
  /**
   * The headline, already broken into lines.
   *
   * Satori has no line-breaking control worth relying on, and an automatic
   * wrap put a payout figure alone on a second line more than once. The caller
   * decides where the break goes because only the caller knows which words
   * must stay together.
   */
  readonly headline: readonly string[];
  /** One supporting line, usually the figure the page exists to state. */
  readonly detail: string;
  /** Right-hand footer text. The left is always the domain. */
  readonly footnote: string;
}

/**
 * The revision of the drawing below.
 *
 * The card fingerprints in `public/og/cards.json` are computed from the words
 * a card carries, which is what catches a rate change. They said nothing about
 * the frame — so when the mark changed, fifteen committed cards would have
 * kept the old one and `validate:localized-og` would have reported them
 * current. Bumping this invalidates every card, which is exactly what a change
 * to the artwork should do.
 */
export const MARK_VERSION = 2;

/** The site mark, drawn rather than loaded so the card has no asset to fetch. */
function Mark() {
  /*
   * Divs rather than an inline <svg>. Satori lays out a flex box exactly, and
   * the mark is three rectangles, so there is nothing here that needs a vector
   * — and nothing that depends on how much of the SVG spec Satori implements.
   *
   * The geometry is `src/app/icon.svg` on its 32 grid, scaled by 2.375 to the
   * 76px this card renders it at.
   */
  const BAR = 12; // 5 on the 32 grid
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "8px",
          width: 76,
          height: 76,
          paddingLeft: 14,
          borderRadius: 18,
          background: "#2563eb",
        }}
      >
        <div style={{ width: 48, height: BAR, borderRadius: BAR / 2, background: "#fff" }} />
        <div style={{ width: 27, height: BAR, borderRadius: BAR / 2, background: "#fff" }} />
      </div>
      <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#0b1220" }}>
        DevEx
        <span style={{ fontWeight: 500, color: "#526174" }}>Calculator</span>
      </div>
    </div>
  );
}

export function renderOgImage(card: OgCard): ImageResponse {
  /*
   * The headline shrinks by one step once it runs to three lines. Two sizes
   * rather than a measured fit: Satori cannot report what it laid out, so any
   * "fit the text" logic here would be guessing at glyph widths, and guessing
   * wrong clips a payout figure off the edge of the card.
   */
  const headlineSize = card.headline.length > 2 ? 52 : 62;

  /*
   * The supporting line steps down rather than wrapping badly.
   *
   * Roughly sixty-four characters fit on one line at 30px inside this padding.
   * A step down instead of a hard limit because these strings carry figures
   * from the rate registry: a rate change that adds a digit must never be able
   * to fail a build, and an orphaned word on a second line was the actual
   * defect — one card read "...count toward" and then "it".
   */
  const detailSize = card.detail.length > 64 ? 26 : 30;

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
        <Mark />

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
              fontSize: headlineSize,
              fontWeight: 700,
              color: "#0b1220",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            {card.headline.map((line) => (
              <div key={line} style={{ display: "flex" }}>
                {line}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: detailSize, color: "#526174" }}>
            {card.detail}
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
          <div style={{ display: "flex" }}>{card.footnote}</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
