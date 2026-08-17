# Metadata and structured data policy

## Metadata

Every field is derived from the route's manifest record by
`src/lib/seo/metadata.ts`, so a title, a description and a canonical cannot
disagree with what the validators check.

Every indexable page has: a unique title, a unique meta description, exactly one
visible H1, an absolute self-referencing canonical, Open Graph title,
description, URL, type, site name and image, Twitter card metadata, correct
robots directives, and `lang="en"` on the document.

**Titles** lead with the user's task and append the brand only when there is
room under 60 characters — truncating the task to fit the brand would be the
wrong trade. No year modifiers: they invite staleness on pages that are not
genuinely year-sensitive.

**Descriptions** summarise what is actually on the page. They are not keyword
fields. Every one is under 160 characters; the content validator warns above
that, and 14 descriptions were tightened in response rather than the warning
being ignored.

**No meta keywords tag.** A route check fails the build if one ever appears.

## Canonicals

- Absolute HTTPS, always self-referencing for an indexable page.
- Calculator query states canonicalise to their clean owning route.
- Amount pages self-canonicalise only after passing the publication gates.
- `scripts/quality/check-routes.ts` fetches every indexable route and asserts
  its canonical equals `https://devexcalculator.org` plus its path.

## Structured data

One JSON-LD graph per page, built by `src/components/seo/json-ld.tsx` from the
same manifest record everything else reads.

| Type | Where | Condition |
|---|---|---|
| `WebSite` | Homepage | Always |
| `Organization` | Homepage | **Only** when a real organisation name is configured |
| `WebApplication` | Tool pages | The page contains a working calculator |
| `WebPage` | Content pages | Default |
| `CollectionPage` | Directories | The page lists other pages |
| `ItemList` | Directories | Only lists children the page visibly links to |
| `AboutPage` / `ContactPage` | About, contact | |
| `BreadcrumbList` | Non-homepage pages | Breadcrumbs are visibly rendered |

`@id` values are stable and anchored to the canonical URL.

### What is deliberately absent

**`FAQPage`.** Google removed FAQ rich results for most sites, so the markup
would exist purely for its own sake. Visible FAQ accordions are built on native
`<details>` — the answers stay in the DOM, remain crawlable, and work without
JavaScript. That serves a reader whether or not any rich result exists.

**`Organization` without a real name.** `organizationName` is null by default
and no Organization node is emitted. Inventing a publisher is the same class of
fabrication as a fake author biography.

**`Product`, `Review`, `AggregateRating`, `QAPage`.** Nothing is sold, there are
no genuine ratings, and no page is a Q&A thread. Both the route checker and the
E2E suite fail if any of these ever appear.

**`Article` with an author.** No named author exists, so no `Article` node
claims one. Pages are published under the site as publisher.

### Matching visible content

`ItemList` lists only the children a page visibly links to. `BreadcrumbList` is
built from the same `parent` chain the visible breadcrumbs render, so the two
cannot disagree — an E2E test asserts the first breadcrumb item in the markup
matches the first visible one.

## Open Graph images

Generated at build time by `src/app/opengraph-image.tsx` with
`dynamic = "force-static"`, so a social crawler never triggers a Worker
invocation and the build does not depend on runtime `ImageResponse` support
under the adapter.

1200×630, original artwork using the site's own calculation motif. No Roblox
mark, nothing resembling its trade dress. Every page declares
`og:image:alt`, taken from the manifest.

The apple touch icon is generated the same way, because iOS ignores SVG icons.
Everything else uses a scalable SVG rather than shipping downscaled raster
copies.

## Robots

`robots.txt` allows all content and disallows only `/api/`. Nothing needed for
rendering is blocked — blocking CSS or JavaScript stops a search engine seeing
the page a reader sees.

API routes additionally send `x-robots-tag: noindex`, since robots.txt prevents
crawling rather than indexing.

## Validation

| Check | Runs in |
|---|---|
| Unique titles, descriptions, H1s | `validate:content`, `validate:routes` |
| Canonical absolute and self-referencing | `validate:routes` |
| Exactly one H1 per page | `validate:routes` |
| No meta keywords tag | `validate:routes` |
| OG and Twitter fields present | `validate:routes` |
| JSON-LD parses | `validate:routes`, E2E |
| No unsupported schema types | `validate:routes`, E2E |
| Declared schema types actually emitted | `validate:routes` |
| Images have alt text and dimensions | `validate:routes` |
| Sitemap matches indexable routes exactly | `validate:routes`, E2E |
| Breadcrumb markup matches visible trail | E2E |
