/**
 * The IndexNow key file.
 *
 * IndexNow proves that whoever submits a URL controls the site, by requiring
 * the key to be readable from the host itself. The file is served from here
 * rather than committed to `public/` for one reason: the key would then be in
 * the repository, and a key in a public repository can be used by anyone to
 * submit URLs on this site's behalf.
 *
 * `INDEXNOW_KEY` is a Cloudflare Worker secret. With it unset — which is the
 * default, and the state of every local build — this route 404s, exactly as
 * though the file did not exist, and the submission script refuses to run.
 * Nothing here is ever a placeholder.
 *
 * The spec's default is a file named `{key}.txt` at the root; a differently
 * named file is allowed as long as submissions name it in `keyLocation`, which
 * is what `scripts/seo/indexnow.ts` does. That keeps the filename out of the
 * routing table, where it would otherwise have to be a dynamic segment able to
 * answer to any name at all.
 */

// Rendered per request: it reads a runtime secret, and a static build would
// bake in whatever the value was — or was not — at build time.
export const dynamic = "force-dynamic";

export function GET(): Response {
  const key = process.env.INDEXNOW_KEY?.trim();

  if (!key) {
    return new Response("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(`${key}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // Search engines fetch this to verify a submission; it must not be
      // indexed, and it must not be cached long enough to outlive a rotation.
      "x-robots-tag": "noindex, nofollow",
      "cache-control": "public, max-age=300",
    },
  });
}
