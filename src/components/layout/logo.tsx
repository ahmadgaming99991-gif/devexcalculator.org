/**
 * Brand mark.
 *
 * Two bars, deliberately unequal, on the site's own blue. The inequality is
 * the argument the whole site makes: a Robux balance is not the dollar figure
 * beside it — there is a rate, a threshold, a fee, and an approval that
 * belongs to somebody else.
 *
 * **Why this replaced the previous mark.** That one was a gradient hexagon
 * holding a calculator with a dollar sign on its screen, and it failed at the
 * sizes a mark is actually seen at. A three-stop gradient has about four
 * pixels to resolve in at 16px and averages into a muddier tone; the dollar
 * sign was stroked at 3.1/32, which lands under two pixels and fringes into
 * grey; and the whole thing was lime green on a site whose accent, theme
 * colour and every interactive element are blue. `src/app/icon.svg` sets out
 * the drawing rules the replacement follows.
 *
 * **Why the image and not a wordmark.** The name beside the mark is real text
 * in `Wordmark`, so it follows the theme, can be selected and translated, and
 * is read once by a screen reader rather than twice. No word of the brand is
 * trapped in a bitmap.
 *
 * **Why a PNG for three rectangles.** The `<img>` with a density-switched
 * `srcSet` is the contract the header, the footer and the browser-image test
 * already share, and the drawing is now cheap enough that keeping it costs
 * nothing: 623 bytes at 1x, against 7.1 kB for the artwork it replaced. Width
 * and height are set so the mark reserves its own space and cannot shift the
 * header as it loads. The mark is square now, where the cropped artwork was
 * 35x40, so the slot is five pixels wider at the same height.
 *
 * The path carries a version because the files are served immutable for a
 * year. A stable filename with a year-long cache would leave this revision
 * sitting behind the old green hexagon in a returning reader's browser until
 * 2027. `v1` stays on disk so a page already cached with the old markup still
 * finds the file it asks for.
 */

/** Intrinsic size of the 1x file. The others are exact 2x and 3x multiples. */
const INTRINSIC = { width: 40, height: 40 } as const;

const BASE = "/brand/v2";

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
          runtime and a loader for one 623-byte PNG that never needs resizing. */}
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
          // pasted onto it. Tinted to the brand blue rather than black.
          "[filter:drop-shadow(0_1px_2px_rgba(37,99,235,0.35))]",
          interactive
            ? [
                "transform-3d",
                "motion-safe:transition-[transform,filter] motion-safe:duration-300 motion-safe:ease-out",
                // The lift: it turns towards the reader, tips back a little,
                // and the shadow grows to match. Small on purpose — this is a
                // link in a header, not a product shot.
                "group-hover:motion-safe:-rotate-y-12 group-hover:motion-safe:rotate-x-6",
                "group-hover:motion-safe:scale-108",
                "group-hover:motion-safe:[filter:drop-shadow(0_6px_10px_rgba(37,99,235,0.45))]",
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
