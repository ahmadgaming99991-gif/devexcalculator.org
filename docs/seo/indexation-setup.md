# Search Console, Bing and IndexNow — operator checklist

Everything here is optional and everything here is **off by default**. The site
builds, deploys and serves correctly with none of it configured; each item
simply stays absent rather than rendering a placeholder.

Nothing in this file requires a code change. Each step is a value the owner
sets, plus one command to confirm the result.

---

## 1. Google Search Console

The property is `https://devexcalculator.org`. Both the apex and `www` resolve
to the same Worker, and `www` 308s to the apex, so verify the **domain**
property if DNS is available — it covers every subdomain and both protocols at
once, and needs no tag in the HTML.

### Option A — DNS (preferred)

Add the TXT record Search Console gives you at the Cloudflare zone. Nothing in
this repository changes.

### Option B — meta tag

Set the environment variable and redeploy:

```
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=<the content value, not the whole tag>
```

Paste only the token. `src/lib/seo/verification.ts` rejects a pasted `<meta>`
element, anything under sixteen characters, anything containing whitespace, and
anything placeholder-shaped — so a half-finished value produces no tag at all
rather than one that verifies nothing.

Confirm:

```bash
curl -s https://devexcalculator.org/ | grep -o 'google-site-verification[^>]*'
```

### After verification

1. Submit `https://devexcalculator.org/sitemap.xml`.
2. Check **Pages** for anything excluded that should not be — the sitemap
   contains only canonical indexable routes, so every exclusion is worth
   reading.
3. Inspect two or three URLs and confirm the canonical Google picked is the one
   the page declares.
4. Read **Core Web Vitals**, **Manual actions** and **Security issues** once.
   All three should be empty; if they are not, that is a real finding.

---

## 2. Bing Webmaster Tools

Bing can **import the property from Search Console**, which needs no tag at
all and is the shortest path once step 1 is done.

If importing is not possible:

```
NEXT_PUBLIC_BING_SITE_VERIFICATION=<the content value of msvalidate.01>
```

Confirm:

```bash
curl -s https://devexcalculator.org/ | grep -o 'msvalidate.01[^>]*'
```

Then submit the same sitemap.

---

## 3. IndexNow

IndexNow tells participating engines that a URL has changed rather than waiting
for them to come back. **Bing, Yandex, Seznam and Naver participate. Google
does not** — it has never joined, and this is not a substitute for Search
Console.

### Setting the key

Generate any random hex string of 8–128 characters and store it as a Worker
secret:

```bash
npx wrangler secret put INDEXNOW_KEY
```

Do **not** commit it. A key in a public repository lets anyone submit URLs on
this site's behalf. With the secret set, `/indexnow.txt` serves it so engines
can verify a submission; with it unset that route 404s, which is the state of
every local build.

Confirm:

```bash
curl -s https://devexcalculator.org/indexnow.txt
```

### Submitting

```bash
npm run seo:indexnow -- --dry-run     # prints what would be sent
INDEXNOW_KEY=... npm run seo:indexnow # sends it
```

With no arguments it submits the routes carrying the newest `dateModified` in
the route registry — the pages a release actually changed. `--since=YYYY-MM-DD`
widens that; `--all` submits everything and has to be asked for, because a
submission covering more than a quarter of the site is refused otherwise.

Every URL comes from the route registry, so an API endpoint, a noindex route or
a query-string state cannot be submitted even deliberately.

### When to run it

After a deployment that changed published figures or page content. Not after
every deploy: a site that reports everything as changed every time teaches a
crawler to discount the notification, which is the one thing IndexNow is for.

---

## 4. What is deliberately not automated

**Nothing here runs in CI.** Submitting URLs and verifying ownership are
actions with an outside effect, and both are tied to accounts this repository
does not own. They are commands an operator runs, having decided to.

**No new page is ever published from search data.** The Search Console workflow
in section 5 can propose amount pages; the publication gate in
`docs/seo/indexation-policy.md` still decides, and it asks for more than query
volume.

---

## 5. Reading a Search Console export

Search Console is the only source of what people actually type. This site was
built from two competitor exports — a record of what competitors rank for, not
of demand — which is why sixty-three amount pages have been held since launch.

```
1. Search Console → Performance → Search results
2. Set the date range → Export → Download CSV (arrives as a zip)
3. Unzip into private/search-console/
4. npm run seo:search-console
```

`private/` is git-ignored, and so is the report it writes there. A performance
export is the owner's data about their own property; committing it would
publish a list of every query this site is seen for.

The report contains four sections:

| Section | What it means |
|---|---|
| Positions worth moving | Queries at positions 5–20, where the page is already understood to be relevant and is not being clicked |
| Shown often, clicked rarely | Pages under 2% click-through — usually a title or a snippet, not the content |
| Queries answered by more than one page | Possible cannibalisation. Sometimes it is two genuine intents sharing a phrase; only reading both pages tells you which |
| Amount queries with no page | The evidence the held amount pages have been waiting for |

**Every finding is a proposal.** Nothing in the report publishes a page, edits
the route registry or unblocks a held amount. The gate in
`docs/seo/indexation-policy.md` asks for distinct search behaviour, unique
worked examples and an intent no existing route already serves — none of which
a volume figure can answer on its own.

The output is deterministic: the same export produces a byte-identical report,
so two months can be diffed.
