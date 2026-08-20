import { changelogEntries, lastChangedAt, type ChangeEntry } from "./changelog";
import { siteConfig } from "@/config/site";

/**
 * The changelog as a feed.
 *
 * This site's entire proposition is that every figure carries the date it was
 * verified, and a rate change is the one event a reader would want delivered
 * rather than remembered. Until now that record existed only as HTML, which
 * asks anyone depending on these numbers to come back and check by hand.
 *
 * Two formats, because the audiences differ and neither is a superset of the
 * other: Atom for feed readers, and JSON Feed for anything that would otherwise
 * have to parse XML — including the people already reading `/api/rates`.
 *
 * Both are generated from `changelogEntries`, so a change recorded on the page
 * is in the feed by construction. There is no separate list to keep in step.
 */

const SITE = `https://${siteConfig.host}`;
const FEED_TITLE = `${siteConfig.name} — rate and data changes`;
const FEED_DESCRIPTION =
  "Every change to the DevEx rates, minimums and fee percentages published on this site, with the date and the source each was verified against.";

/**
 * A stable, unique id for an entry.
 *
 * A `tag:` URI rather than a URL because these entries have no page of their
 * own — they are sections of the changelog. Deriving it from the date and a
 * slug of the title keeps it stable as long as neither changes, which is the
 * contract a feed reader needs to avoid showing the same item twice.
 */
function entryId(entry: ChangeEntry): string {
  const slug = entry.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `tag:${siteConfig.host},${entry.date.slice(0, 10)}:${entry.kind}/${slug}`;
}

/** XML text escaping. Applied to every interpolated value without exception. */
function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * The entry body, as plain text.
 *
 * Deliberately not HTML. The detail is prose and a source link; wrapping it in
 * markup would mean escaping decisions in two places and give a feed reader
 * something to sanitise for no gain.
 */
function entryText(entry: ChangeEntry): string {
  const source =
    entry.sourceUrl && entry.sourceLabel
      ? `\n\nSource: ${entry.sourceLabel} — ${entry.sourceUrl}`
      : "";
  return `${entry.detail}${source}`;
}

export function atomFeed(): string {
  const entries = changelogEntries
    .map(
      (entry) => `  <entry>
    <title>${xml(entry.title)}</title>
    <id>${xml(entryId(entry))}</id>
    <updated>${xml(entry.date)}</updated>
    <link rel="alternate" href="${xml(`${SITE}/changelog/`)}"/>
    <category term="${xml(entry.kind)}"/>
    <content type="text">${xml(entryText(entry))}</content>
  </entry>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${xml(FEED_TITLE)}</title>
  <subtitle>${xml(FEED_DESCRIPTION)}</subtitle>
  <id>${xml(`${SITE}/changelog/`)}</id>
  <updated>${xml(lastChangedAt())}</updated>
  <link rel="alternate" type="text/html" href="${xml(`${SITE}/changelog/`)}"/>
  <link rel="self" type="application/atom+xml" href="${xml(`${SITE}/feed.xml`)}"/>
${entries}
</feed>
`;
}

export function jsonFeed(): object {
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: FEED_TITLE,
    description: FEED_DESCRIPTION,
    home_page_url: `${SITE}/changelog/`,
    feed_url: `${SITE}/feed.json`,
    /*
     * Pointed at the machine-readable registry rather than a contact address.
     * Anyone consuming this feed is almost certainly after the numbers, and
     * this is where they are.
     */
    description_url: `${SITE}/api/`,
    items: changelogEntries.map((entry) => ({
      id: entryId(entry),
      url: `${SITE}/changelog/`,
      title: entry.title,
      content_text: entryText(entry),
      date_published: entry.date,
      tags: [entry.kind],
      ...(entry.sourceUrl ? { external_url: entry.sourceUrl } : {}),
    })),
  };
}
