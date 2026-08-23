/**
 * The people behind this site, in one place.
 *
 * Two of them, both real and both named with their consent. The byline, the
 * profile pages and every JSON-LD block read from here, so a bio cannot say
 * one thing on a page and another in structured data — which is exactly how a
 * site ends up with a modest description for humans and an inflated one for
 * search engines.
 *
 * Three rules this file exists to hold:
 *
 *   1. **Nothing here is written to impress.** Each `bio` is the text the
 *      person supplied about themselves. Neither is edited upward into domain
 *      expertise, and the reviewer in particular is not described as knowing
 *      what a Roblox rate ought to be — his qualification is the checking
 *      process he runs, not special knowledge of Roblox.
 *   2. **An absent fact is absent.** No photo means an initials avatar and no
 *      `image` in the schema, not a stock portrait. No email means no address,
 *      not one that looks plausible.
 *   3. **Being listed here is not a claim to have reviewed anything.** A review
 *      credit is per-page data, set deliberately on the pages that actually had
 *      one; see `reviewedBy` in the route registry. A reviewer's name on a page
 *      nobody reviewed is a fabricated trust signal, which is worse than
 *      showing no reviewer at all.
 */

/** What someone does here. The site has exactly these two roles. */
export type PersonKind = "author" | "reviewer";

export interface Avatar {
  /** Square, 512px. Serves the profile page. */
  readonly large: { readonly webp: string; readonly jpg: string };
  /** Square, 96px. Serves the byline and the index. */
  readonly small: { readonly webp: string; readonly jpg: string };
  /** Written into `alt`, so it says who this is and why they are here. */
  readonly alt: string;
}

export interface SitePerson {
  readonly slug: string;
  readonly name: string;
  /** Displayed role, and the `jobTitle` in schema. */
  readonly role: string;
  readonly kind: PersonKind;
  /** Supplied by the person. Rendered verbatim, and used as `description`. */
  readonly bio: string;
  /**
   * Profile URLs, already stripped of tracking parameters. A `?utm_source=` or
   * `?s=` on a profile link is a share-link artefact: it tells the destination
   * where the reader came from, which is nobody's business here, and a test
   * asserts none survives.
   */
  readonly sameAs: readonly string[];
  /** Null where no address has been supplied. Never invented. */
  readonly email: string | null;
  /** Null until a real photograph exists; `initials` covers that case. */
  readonly avatar: Avatar | null;
  /** Fallback avatar, and the source of the initials in the markup. */
  readonly initials: string;
}

const AVATAR_BASE = "/images/authors/v1";

export const AHMAD_RAZA: SitePerson = {
  slug: "ahmad-raza",
  name: "Ahmad Raza",
  role: "Founder & Maintainer",
  kind: "author",
  bio:
    "Ahmad Raza is an independent web publisher and SEO specialist from Pakistan who builds and maintains reference tools and informational sites. He built DevExCalculator.org after finding that Roblox creators searching for payout figures kept landing on pages quoting stale or incorrect DevEx rates. He maintains the rate data on this site against Roblox's official Developer Exchange documentation and Roblox Corporation's published SEC filings, and records every change to a published figure in the site changelog. He is not affiliated with Roblox Corporation and has no access to internal Roblox data.",
  sameAs: ["https://www.linkedin.com/in/ahmad-raza-seo-expert-b77657208/"],
  email: "devexcalculator@gmail.com",
  avatar: {
    large: {
      webp: `${AVATAR_BASE}/ahmad-raza-512.webp`,
      jpg: `${AVATAR_BASE}/ahmad-raza-512.jpg`,
    },
    small: {
      webp: `${AVATAR_BASE}/ahmad-raza-96.webp`,
      jpg: `${AVATAR_BASE}/ahmad-raza-96.jpg`,
    },
    alt: "Ahmad Raza, founder and maintainer of DevExCalculator.org",
  },
  initials: "AR",
};

export const SAEED_AHMED: SitePerson = {
  slug: "saeed-ahmed",
  name: "Saeed Ahmed",
  role: "Content Reviewer & Fact-Checker",
  kind: "reviewer",
  bio:
    "Saeed Ahmed is a full-stack developer and SEO specialist. On DevExCalculator.org he reviews published figures before they go live: he checks each rate, fee split and threshold against the primary source it is cited from, confirms the page's stated verification date matches when that source was last checked, and flags anything that has drifted. He does not work for Roblox and has no access to internal Roblox data.",
  sameAs: [
    "https://www.linkedin.com/in/saeed-ahmed-976812273",
    "https://x.com/saeeddeveloper1",
  ],
  // No address supplied. Reviewer contact goes through the site's contact page.
  email: null,
  // No photograph supplied. The profile renders "SA" until one exists, and his
  // Person schema carries no `image` — an absent portrait is not a reason to
  // borrow somebody else's face from a stock library.
  avatar: null,
  initials: "SA",
};

export const people: readonly SitePerson[] = [AHMAD_RAZA, SAEED_AHMED];

export function findPerson(slug: string): SitePerson | null {
  return people.find((person) => person.slug === slug) ?? null;
}

/** Profile URL for a person, with the site's trailing-slash policy applied. */
export function personRoute(person: Pick<SitePerson, "slug">): string {
  return `/authors/${person.slug}/`;
}
