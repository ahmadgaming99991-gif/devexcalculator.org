/** Types for the content manifest that drives routing, metadata and validation. */

export type PageType =
  | "tool"
  | "pillar-guide"
  | "directory"
  | "conversion-hub"
  | "conversion-amount"
  | "trust"
  | "legal"
  | "utility";

export type IndexationState = "index" | "noindex";

export type PublicationStatus = "published" | "draft" | "review";

export type SchemaType =
  | "WebSite"
  | "Organization"
  | "WebApplication"
  | "WebPage"
  | "CollectionPage"
  | "ItemList"
  | "AboutPage"
  | "ContactPage"
  | "BreadcrumbList";

export interface FaqEntry {
  readonly question: string;
  readonly answer: string;
  /** Source ids backing any time-sensitive claim in the answer. */
  readonly sourceIds?: readonly string[];
}

export interface SectionRef {
  /** Anchor id, used for the table of contents and quick-answer jump links. */
  readonly id: string;
  readonly heading: string;
}

export interface InternalLink {
  readonly route: string;
  /** Descriptive anchor text. Varied per context, never a bare keyword block. */
  readonly anchor: string;
  readonly relationship: "parent" | "child" | "sibling" | "next-step" | "prerequisite" | "tool";
}

export interface RouteRecord {
  /** Canonical path, always lowercase with a trailing slash (except `/`). */
  readonly route: string;
  readonly status: PublicationStatus;
  readonly indexation: IndexationState;
  readonly pageType: PageType;

  readonly title: string;
  readonly metaDescription: string;
  readonly h1: string;
  /** Short label for navigation and breadcrumbs. */
  readonly navLabel: string;

  readonly primaryIntent: string;
  readonly primaryKeyword: string;
  readonly secondaryKeywords: readonly string[];
  readonly entities: readonly string[];

  readonly sourceIds: readonly string[];
  readonly lastReviewedAt: string;
  /** Drives sitemap `lastmod`; updated when content or rates actually change. */
  readonly dateModified: string;

  /** Direct answer rendered near the top of the page, 40–70 words. */
  readonly quickAnswer: string;
  readonly sections: readonly SectionRef[];
  readonly faqs: readonly FaqEntry[];
  readonly internalLinks: readonly InternalLink[];
  readonly schemaTypes: readonly SchemaType[];

  /** Parent route in the topical hierarchy. `null` only for the homepage. */
  readonly parent: string | null;
  /** Whether the route appears in the primary navigation. */
  readonly inPrimaryNav: boolean;
  /** Whether the route is rate-sensitive and must show a last-verified badge. */
  readonly rateSensitive: boolean;
  /** Alt text for the Open Graph image. */
  readonly ogImageAlt: string;
}
