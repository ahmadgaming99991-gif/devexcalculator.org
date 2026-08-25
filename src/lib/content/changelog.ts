/**
 * The public changelog.
 *
 * Records what this site did, dated. Deliberately starts at launch rather than
 * inventing a back-history — an empty-looking changelog on a new site is
 * honest, and a fabricated one would undermine everything else on the page.
 *
 * Lifted out of the page component so the feed can publish the same entries.
 * A changelog that only exists as HTML asks every reader to check it by hand;
 * the whole proposition of this site is "verified on this date", and a rate
 * change is precisely the event someone would want delivered rather than
 * remembered.
 */
export interface ChangeEntry {
  /**
   * Stable name for this entry, and the key its words live under.
   *
   * `trust.changelog.entries.<id>` and `<id>Detail`. An id rather than the
   * English title because the title is itself translated, and a lookup
   * keyed by the thing being looked up cannot work.
   */
  readonly id: string;
  readonly date: string;
  readonly kind: "rate" | "content" | "site";
  readonly title: string;
  readonly detail: string;
  readonly sourceUrl?: string;
  /**
   * The external document this entry was checked against, named as that
   * document names itself.
   *
   * Not translated, in any locale. A citation points at a specific English
   * page; renaming it in Turkish would send a reader looking for a title that
   * does not exist. The surrounding sentence is translated, the title is not.
   */
  readonly sourceLabel?: string;
}

const ENTRIES: readonly ChangeEntry[] = [
  {
    id: "registryEstablished",
    date: "2026-08-17T00:00:00Z",
    kind: "rate",
    title: "Rate registry established and verified",
    detail:
      "Standard rate recorded at 0.0038 USD per eligible Earned Robux (114 USD per 30,000), the legacy rate at 0.0035 for balances earned before 5 September 2025 at 10:00 PT, and the conditional U.S. 18+ rate at 0.0054. The 30,000 Earned Robux minimum and the full eligibility list were verified at the same time. All checked directly against the Roblox Creator Hub DevEx documentation.",
    sourceUrl: "https://create.roblox.com/docs/production/monetization/developer-exchange",
    sourceLabel: "Roblox Creator Hub — Developer Exchange",
  },
  {
    id: "marketplaceRecorded",
    date: "2026-08-17T00:00:00Z",
    kind: "rate",
    title: "Marketplace commission rates recorded",
    detail:
      "In-experience purchases recorded at 70% to the creator and 30% to Roblox. Marketplace avatar item sales recorded with the progressive revenue share table from 30% at the price floor to 70% at six times the floor. Avatar items sold inside an experience recorded as 30% creator, 40% experience owner, 30% Roblox.",
    sourceUrl: "https://create.roblox.com/docs/marketplace/marketplace-fees-and-commissions",
    sourceLabel: "Roblox Creator Hub — Marketplace fees and commissions",
  },
  {
    date: "2026-08-17T00:00:00Z",
    id: "levRemoved",
    kind: "site",
    title: "Bulgarian lev removed from supported currencies",
    detail:
      "The European Central Bank stopped publishing a BGN reference rate after 31 December 2025. Rather than continue showing a rate frozen at that date, BGN was removed from the currency selector. Listing a currency the configured provider no longer supplies would misrepresent how current the figure is.",
    sourceUrl: "https://data-api.ecb.europa.eu/",
    sourceLabel: "ECB Data Portal — Exchange Rates",
  },
  {
    date: "2026-08-17T00:00:00Z",
    id: "siteLaunched",
    kind: "site",
    title: "Site launched",
    detail:
      "Initial release: DevEx calculator with quick, split and target modes; Robux to USD and payout target pages; marketplace fee calculator; conversion hub with eight curated amount pages; and the full guide and trust set. Every rate-sensitive page carries a source citation and verification date from launch.",
  },
];


/** Newest first, which is the order both the page and the feed want. */
export const changelogEntries: readonly ChangeEntry[] = [...ENTRIES].sort((a, b) =>
  b.date.localeCompare(a.date),
);

/** The most recent change, which dates the feed itself. */
export function lastChangedAt(): string {
  return changelogEntries[0]?.date ?? new Date(0).toISOString();
}
