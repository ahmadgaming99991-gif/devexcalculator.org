# Knowing what Google actually indexed

Everything else in this repository controls what the site **offers** a crawler.
The sitemap lists the pages, `validate:sitemap` proves the list is complete, the
canonicals and hreflang say which version is which, and IndexNow tells Bing,
Yandex, Seznam and Naver the moment something changes.

None of that tells you what Google **did**.

Google indexes what it wants. A sitemap is a suggestion, not an instruction,
and no API, ping, plugin or paid tool can force a page into the index. Anything
selling "guaranteed indexing" is selling a lie. What you *can* do is read the
answer back, and that is what `npm run seo:index-status` is for.

## What it tells you

For every URL in the sitemap, the same verdict Search Console shows a person:

| | |
|---|---|
| `Submitted and indexed` | Google has it. Nothing to do. |
| `Crawled - currently not indexed` | Google fetched it and chose not to index it. Usually a quality or duplication judgement — the page needs to be more worth having, not resubmitted. |
| `Discovered - currently not indexed` | Google knows the URL exists and has not fetched it. Often crawl budget on a large or slow site. |
| `Duplicate, Google chose different canonical` | Google disagrees with the page's own canonical. The report names the URL it picked instead, which is the actual bug to fix. |
| `Blocked by robots.txt` | Something is disallowing it. |

It also flags every page where Google's chosen canonical differs from the
page's own — the failure that quietly removes a page from search while
everything on the site looks correct.

## What it does not do

It **reads**. The access token is requested with `webmasters.readonly`, so this
credential cannot submit a sitemap, request removal, or change a setting. It
changes nothing about the site and nothing about the property.

Quota is 2,000 URLs a day per property. The sitemap is 252, so a full pass is
one run.

## One-time setup

The API needs a Google service account with access to the Search Console
property. Four steps, all in Google's consoles:

1. **Google Cloud console** → create a project (or use one) → **APIs &
   Services → Enable APIs** → enable **Google Search Console API**.
2. **IAM & Admin → Service Accounts** → create one → **Keys → Add key → JSON**.
   Download it.
3. **Search Console** → your property → **Settings → Users and permissions →
   Add user** → paste the service account's email address (it looks like
   `name@project.iam.gserviceaccount.com`) → permission **Full**.
   Without this step every call returns 403.
4. Put the JSON file **outside this repository** — next to the Cloudflare token
   is the obvious place — and name its path in `.claude/deploy.env`:

   ```
   GOOGLE_SC_KEY_FILE=C:/Users/you/devex-search-console.json
   ```

   `.claude/deploy.env` is git-ignored, and it holds the *path*, never the key.
   Never move the JSON into the repository: it is a credential that can read
   the property's full performance data.

## Running it

```
npm run seo:index-status                    # every URL in the sitemap
npm run seo:index-status -- --only-problems # just the ones Google has not indexed
npm run seo:index-status -- --limit=50      # a sample
```

The full report is written to `private/index-status.json`, which is git-ignored
for the same reason the Search Console exports are: it is the owner's data about
their own property.

## Reading the result honestly

A page that is `Crawled - currently not indexed` does not need resubmitting.
Google has already looked. Submitting it again tells Google nothing it does not
know, and doing that repeatedly is how a site trains a crawler to ignore it.
The useful response is to ask what that page offers that the rest of the site
does not — which is a content question, not a technical one.

The technical failures worth acting on immediately are the canonical
mismatches, anything blocked by robots.txt that should not be, and any URL in
the sitemap returning an error. `validate:sitemap` already prevents the last
category from reaching production.
