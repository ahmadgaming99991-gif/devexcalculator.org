import { getTranslator, interpolate, type Translate } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/types";
import { siteConfig } from "@/config/site";
import { cx } from "@/components/ui";

/**
 * The site's own social profiles, as brand-coloured tiles.
 *
 * Read from `siteConfig.social`, so a profile appears here and in the
 * structured data's `sameAs` from one declaration. A network with no account
 * is null there and renders nothing here — this row never shows a link to a
 * profile that does not exist.
 *
 * The depth is CSS, not images. Each tile is a two-stop gradient with a light
 * inner edge along the top and a shadow tinted with the network's own colour,
 * which is what makes it read as a raised object rather than a coloured
 * square. No image is fetched, nothing is loaded from the networks themselves,
 * and no third-party script runs — the same rule the rest of the site follows,
 * and the reason there are no official embed badges here.
 *
 * The glyphs are drawn from scratch as simple marks. They are nominative use —
 * naming where this site's own accounts are — and no network's logo file,
 * font or trade dress is reproduced.
 *
 * Accessibility notes that are not optional here:
 *   - Every base colour clears 3:1 against the white glyph, which is what WCAG
 *     2.2 asks of a graphic that carries meaning. The X tile is lifted off pure
 *     black in dark mode for the same reason the tile has a ring: a black
 *     square on a near-black page is invisible.
 *   - The label is real text for a screen reader, and the tile carries a
 *     visible focus ring rather than relying on colour alone.
 *   - Every transform is behind `motion-safe`, so a reader who asked for
 *     reduced motion gets the colour and none of the movement.
 */

interface Network {
  readonly id: string;
  readonly label: string;
  /** What the reader is told they will find, not just the network name. */
  readonly description: string;
  readonly href: string | null;
  /** Two-stop gradient built from that network's tokens. */
  readonly background: string;
  /**
   * The gradient's lighter stop, painted as a solid colour underneath it.
   *
   * Not decoration. A gradient leaves `backgroundColor` reporting
   * `rgba(0, 0, 0, 0)`, and the contrast check that reads it would pass on
   * nothing at all — which is exactly how the primary button's check quietly
   * stopped working once it gained a gradient. This is the worse of the two
   * stops for a white glyph, so measuring it measures the worst case.
   */
  readonly base: string;
  /** Shadow tint, as an `r g b` triple so opacity can be applied. */
  readonly glow: string;
  readonly glyph: React.ReactNode;
}

function networks(t: Translate): Network[] {
  const all: Network[] = [
    {
      id: "youtube",
      label: "YouTube",
      description: t("common.social.youtube"),
      href: siteConfig.social.youtube,
      background:
        "linear-gradient(160deg, var(--brand-youtube) 0%, var(--brand-youtube-deep) 100%)",
      base: "var(--brand-youtube)",
      glow: "var(--brand-youtube-glow)",
      glyph: (
        <>
          <path
            d="M21.6 7.2a2.5 2.5 0 0 0-1.75-1.77C18.28 5 12 5 12 5s-6.28 0-7.85.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.75 1.77C5.72 19 12 19 12 19s6.28 0 7.85-.43a2.5 2.5 0 0 0 1.75-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8Z"
            fill="currentColor"
          />
          <path d="M10.25 14.9V9.1L15.2 12l-4.95 2.9Z" className="fill-(--brand-youtube)" />
        </>
      ),
    },
    {
      id: "x",
      label: "X",
      description: t("common.social.x"),
      href: siteConfig.social.x,
      background: "linear-gradient(160deg, var(--brand-x) 0%, var(--brand-x-deep) 100%)",
      base: "var(--brand-x)",
      glow: "var(--brand-x-glow)",
      glyph: (
        <path
          d="M17.2 4h2.9l-6.34 7.25L21.5 20h-5.72l-4.48-5.53L6.16 20H3.25l6.78-7.75L3 4h5.86l4.05 5.06L17.2 4Zm-1.02 14.3h1.6L8.1 5.6H6.38l9.8 12.7Z"
          fill="currentColor"
        />
      ),
    },
    {
      id: "instagram",
      label: "Instagram",
      description: t("common.social.instagram"),
      href: siteConfig.social.instagram,
      /*
       * Three stops rather than two, because Instagram's identity is the
       * sweep itself. Anchored on the darker end of its palette: the yellow
       * stop everyone reaches for first cannot hold a white glyph at 3:1.
       */
      background:
        "linear-gradient(145deg, var(--brand-instagram-from) 0%, var(--brand-instagram-via) 55%, var(--brand-instagram-to) 100%)",
      // The sweep's lightest stop, which is the one a white glyph has to beat.
      base: "var(--brand-instagram-to)",
      glow: "var(--brand-instagram-glow)",
      glyph: (
        <>
          <rect
            x="3.2"
            y="3.2"
            width="17.6"
            height="17.6"
            rx="5.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
          />
          <circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <circle cx="17.1" cy="6.9" r="1.25" fill="currentColor" />
        </>
      ),
    },
    {
      id: "pinterest",
      label: "Pinterest",
      description: t("common.social.pinterest"),
      href: siteConfig.social.pinterest,
      background:
        "linear-gradient(160deg, var(--brand-pinterest) 0%, var(--brand-pinterest-deep) 100%)",
      base: "var(--brand-pinterest)",
      glow: "var(--brand-pinterest-glow)",
      glyph: (
        <path
          d="M12 3.2a8.8 8.8 0 0 0-3.2 17 8.5 8.5 0 0 1 .03-2.5c.16-.7 1.05-4.45 1.05-4.45a3.2 3.2 0 0 1-.27-1.32c0-1.24.72-2.17 1.61-2.17.76 0 1.13.57 1.13 1.26 0 .76-.49 1.9-.74 2.96-.21.88.44 1.6 1.31 1.6 1.58 0 2.79-1.66 2.79-4.06 0-2.12-1.53-3.6-3.71-3.6a3.84 3.84 0 0 0-4 3.85c0 .77.29 1.59.66 2.04.07.09.08.17.06.26l-.25 1c-.04.16-.13.2-.3.12-1.1-.51-1.79-2.12-1.79-3.42 0-2.78 2.02-5.34 5.83-5.34 3.06 0 5.44 2.18 5.44 5.09 0 3.04-1.92 5.49-4.58 5.49-.89 0-1.73-.47-2.02-1.02l-.55 2.1c-.2.77-.74 1.73-1.1 2.32A8.8 8.8 0 1 0 12 3.2Z"
          fill="currentColor"
        />
      ),
    },
  ];

  return all.filter((network): network is Network => network.href !== null);
}

export async function SocialLinks({
  locale,
  className,
}: {
  readonly locale: Locale;
  className?: string;
}) {
  const t = await getTranslator(locale, ["common"]);
  const items = networks(t);
  if (items.length === 0) return null;

  return (
    // A landmark, like the other footer link groups, so it can be reached and
    // skipped as one thing rather than as four loose links.
    <nav aria-label={t("common.footer.socialProfiles")} className={cx("min-w-0", className)}>
      <h2 className="text-xs font-semibold tracking-wide text-(--color-text) uppercase">
        {t("common.footer.followHeading")}
      </h2>
      <ul className="mt-3 flex list-none flex-wrap items-center justify-center gap-3 p-0">
        {items.map((network) => (
          <li key={network.id}>
            <a
              href={network.href as string}
              target="_blank"
              rel="me noopener noreferrer"
              className={cx(
                // Sized past the 44px touch target rather than up to it.
                "group relative flex size-11 items-center justify-center overflow-hidden",
                "rounded-[0.9rem] text-white ring-1 ring-black/15 dark:ring-white/20",
                "motion-safe:transition-[transform,box-shadow] motion-safe:duration-200 motion-safe:ease-out",
                "motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus)",
              )}
              style={{
                backgroundColor: network.base,
                backgroundImage: network.background,
                /*
                 * Three layers make the tile: a light inner edge along the top,
                 * a tight contact shadow, and a wider shadow tinted with the
                 * network's own colour. The tint is what stops four tiles
                 * looking like four grey buttons that happen to be coloured in.
                 */
                boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.3), inset 0 -1px 0 rgb(0 0 0 / 0.2), 0 1px 2px rgb(0 0 0 / 0.25), 0 6px 14px -6px rgb(${network.glow} / 0.55)`,
              }}
            >
              {/*
                A soft highlight across the top half, which is the whole trick
                behind the raised look. Purely decorative, so it is hidden from
                assistive technology and sits under the glyph.
              */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/25 to-transparent"
              />
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
                className="relative size-5.5 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:scale-110"
              >
                {network.glyph}
              </svg>
              <span className="sr-only">
                {interpolate(t("common.social.opensInNewTab"), {
                  description: network.description,
                })}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
