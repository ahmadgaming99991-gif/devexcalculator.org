# Cache purge

## What is cached, and for how long

| What | `Cache-Control` | Set by |
| --- | --- | --- |
| `/_next/static/*`, `/icons/*`, `/images/*`, `/brand/*` | `max-age=31536000, immutable` | `public/_headers` |
| `robots.txt`, `llms.txt`, `sitemap.xml` | `max-age=3600` | `public/_headers` |
| Dynamic HTML on four routes | `s-maxage=600, stale-while-revalidate=86400` | `edgeCachePolicy` |
| Prerendered HTML, rate-sensitive | `s-maxage=3600, stale-while-revalidate=86400` | `staticCachePolicy` |
| Prerendered HTML, everything else | `s-maxage=31536000` | Next's default |
| API responses | per endpoint | the route handler |

The fourth row is the one this document is about.

A statically prerendered page leaves Next with `s-maxage=31536000` — a year at
the edge. That is correct for a page that is a fixed document, and wrong for
every page that quotes a rate or a verification date. `/sources/` is the clearest
case: the page exists to say when each source was last checked, and it was
cached for a year, so the date it displayed could be a year older than the date
it was describing.

Which pages count is not a list kept here. It is `rateSensitive` in
`src/lib/content/route-registry.ts` — the same field that decides whether a page
shows a last-verified badge. A page that displays a date it must keep current
therefore cannot be missing from the purge, and there is no second list to drift.
As of writing that is **21 routes**.

## Purging

```
npm run purge:cache
```

`npm run deploy` runs it automatically after the upload.

It needs two environment variables:

```
CLOUDFLARE_API_TOKEN   a token with the Zone → Cache Purge permission
CLOUDFLARE_ZONE_ID     the zone id for devexcalculator.org
```

Neither is stored in the repository, and neither is ever printed — including in
an error message. The token file on the maintainer's machine lives outside the
repository; see `docs/cloudflare-deployment.md`.

**Without them the deploy still succeeds.** The script says what it skipped and
exits 0. Purging makes a correction visible sooner than the hour the cache
header already guarantees; it is not what makes the site correct. A non-zero
exit is kept for a purge that was actually attempted and actually failed, which
is worth interrupting a deploy for.

## Doing it by hand

If the script cannot run — no token to hand, a CI environment without the
secret — the same purge is one call per batch of 30 URLs:

```
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://devexcalculator.org/sources/","https://devexcalculator.org/devex-rates/"]}'
```

`npm run purge:cache` prints the count it would send; the full list is every
`rateSensitive` route in the registry.

## Never purge the whole zone

`{"purge_everything": true}` is one call and is the wrong call. It discards
every cached asset, including the fingerprinted bundles under `/_next/static/`
that are cached for a year *because their contents can never change*. The next
visitor pays for a cold cache on the entire site to fix a handful of HTML
documents. Use the file list.

## Verifying

After a deploy and purge:

```
curl -sI https://devexcalculator.org/sources/ | grep -i "cache-control\|cf-cache-status"
```

Expected:

```
Cache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=86400, must-revalidate
```

`staticCachePolicy` runs in the Worker, so this is the header a real request
returns rather than one asserted in a test. The unit tests in
`tests/unit/cache/static-policy.test.ts` cover which routes it fires on and —
more importantly — which responses it refuses to touch: anything that is not
Next's untouched static default was set deliberately by a route handler or by
the dynamic policy, and is not this function's to overrule.

## What a purge actually evicts today

Measured 2026-09-03, after the deploy token was given `Zone -> Cache Purge`.

The API accepts the purge — `success: true`, where it previously answered
`10000 Authentication error`. It does **not** evict the HTML documents. On
`/devex-rates/`: a successful purge, then eleven requests over sixty seconds,
every one a `HIT` with `Age` climbing 520 -> 557 on the same cached object.

`"cache": { "enabled": true }` in `wrangler.jsonc` puts a Cloudflare cache in
front of the Worker, and its key is not the plain URL, so a purge addressed to
the URL matches nothing. The same property explains why `www` serves 200 on a
hit rather than redirecting — the key does not carry the host either — and why
a cached 301 took the homepage down on 2026-09-02.

So `s-maxage=3600` is still what bounds staleness in practice, and the hour in
the table above is the real number rather than a ceiling a purge cuts short.
`npm run purge:cache` is kept and kept running: the call is correct, it costs
nothing, and it begins working the moment the cache key is addressable.

Making it work needs a cache rule that fixes the key. That is a permission the
deploy token does not hold and a caching change to be proposed, not made.

## The zone id

`CLOUDFLARE_ZONE_ID` is optional. When it is unset, `purge-cache.ts` looks the
zone up by the site's own hostname using the same token, and matches on the
zone name so a broader token cannot purge somebody else's cache. Set the
variable only to pin a specific zone.

## A 403 from the purge API

The token is missing the **Zone → Cache Purge** permission. A token that can
deploy a Worker cannot necessarily purge a cache; they are separate permissions
on the same token. Add it in the Cloudflare dashboard under My Profile → API
Tokens, or issue a second token for this and set it only in the environment that
runs the deploy.
