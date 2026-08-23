/**
 * Brand mark.
 *
 * This is the supplied logo — a hexagon circled by two exchange arrows, holding
 * a calculator whose screen shows a dollar sign — rather than the geometric
 * placeholder that stood here while no real mark existed.
 *
 * **Why the image and not the wordmark in it.** The supplied artwork is a full
 * lockup: the mark, then "DevEx" in green, then "Calculator" in white. That
 * last word is white at low opacity, so on this site's light theme it is
 * invisible and on the dark theme it is faint. Shipping the lockup would mean
 * shipping a brand name that half the readers cannot see, and text baked into a
 * picture cannot be selected, translated, or read by a screen reader. So the
 * mark is cropped out of the artwork and the name beside it stays real text in
 * `Wordmark`, which follows the theme and stays legible at every size.
 *
 * **Why 40px and not 32.** The mark holds a calculator with six keys. Rendered
 * at the 32px the old placeholder used, the keys merge and it reads as a green
 * blob. Forty is where the drawing survives. The tab icon has the same problem
 * and cannot be made bigger, which is why `icon.svg` is drawn rather than
 * downscaled: it keeps the hexagon and the dollar sign and drops everything
 * that dies at sixteen pixels.
 *
 * **Cost.** 2.3 kB on an ordinary screen. Lighthouse caught the first version
 * shipping the 3x file to everyone — 88% of those bytes were thrown away by a
 * 35x40 slot — so there are now three sizes and the browser picks by pixel
 * density. Width and height are set so the mark reserves its own space and
 * cannot shift the header as it loads.
 *
 * The path carries a version because the files are served immutable for a
 * year. A stable filename with a year-long cache would leave a revised logo
 * sitting in a returning reader's browser until 2027; bumping `v1` is how a
 * new mark actually reaches them.
 */

/** Intrinsic size of the 1x file. The others are exact 2x and 3x multiples. */
const INTRINSIC = { width: 35, height: 40 } as const;

const BASE = "/brand/v1";

export function Logo({
  className = "h-10",
  interactive = false,
}: {
  className?: string;
  /**
   * Opts into the hover behaviour. Only true where the mark sits inside a link
   * that owns the `group`, so a decorative instance never animates on a hover
   * that has nothing to do with it.
   */
  interactive?: boolean;
}) {
  return (
    /*
     * The perspective lives on a wrapper rather than the image, because a
     * perspective set on the transformed element itself is applied after the
     * rotation and produces a flat skew instead of a tilt.
     */
    <span className={`inline-block shrink-0 ${interactive ? "perspective-normal" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- A fixed-size
          brand asset in a Server Component. next/image would add a client
          runtime and a loader for one 7 kB PNG that never needs resizing. */}
      <img
        src={`${BASE}/mark-40.png`}
        srcSet={`${BASE}/mark-40.png 1x, ${BASE}/mark-80.png 2x, ${BASE}/mark-120.png 3x`}
        width={INTRINSIC.width}
        height={INTRINSIC.height}
        /*
         * Decorative. `Wordmark` beside it already carries the site's name, so
         * alt text here would make a screen reader announce "DevEx Calculator"
         * twice for one link. The old mark did exactly that.
         */
        alt=""
        /* Above the fold in the header, and the only image in it. */
        fetchPriority={interactive ? "high" : "low"}
        decoding="async"
        className={[
          "block w-auto origin-center",
          // A resting shadow so the mark sits on the page rather than being
          // pasted onto it. Tinted to the brand green rather than black.
          "[filter:drop-shadow(0_1px_2px_rgba(21,152,10,0.35))]",
          interactive
            ? [
                "transform-3d",
                "motion-safe:transition-[transform,filter] motion-safe:duration-300 motion-safe:ease-out",
                // The lift: it turns towards the reader, tips back a little,
                // and the shadow grows to match. Small on purpose — this is a
                // link in a header, not a product shot.
                "group-hover:motion-safe:-rotate-y-12 group-hover:motion-safe:rotate-x-6",
                "group-hover:motion-safe:scale-108",
                "group-hover:motion-safe:[filter:drop-shadow(0_6px_10px_rgba(21,152,10,0.45))]",
                // Keyboard users get the same feedback as pointer users.
                "group-focus-visible:motion-safe:-rotate-y-12 group-focus-visible:motion-safe:scale-108",
              ].join(" ")
            : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
    </span>
  );
}

/**
 * Full lockup used in the header and footer.
 *
 * "DevEx" carries the weight because that is the name people search for;
 * "Calculator" is set lighter so the lockup has a hierarchy rather than being
 * one undifferentiated string. The two are a single word visually, so there is
 * no space between them and the tracking is tightened to match.
 *
 * This is the accessible name of the link the mark sits in, which is why the
 * mark itself is marked decorative.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-bold tracking-tight text-(--color-text)">DevEx</span>
      <span className="font-medium tracking-tight text-(--color-text-muted)">Calculator</span>
    </span>
  );
}
