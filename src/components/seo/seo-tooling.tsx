import { seoToolingConfig } from "@/config/site";

/**
 * The SEOSignalX patch tag.
 *
 * A first-party audit tool the owner runs against this site. Its tag fetches
 * whatever "patches" have been published in that tool's dashboard and applies
 * them to the page in the browser, which is why it has to load in `<head>`
 * rather than after the content it may change.
 *
 * **This is a third party that can rewrite the page.** That is the whole point
 * of it, and it is worth naming plainly rather than burying: nothing in this
 * repository constrains what a published patch may say. The site's own rule —
 * that no figure is published which cannot be traced to a document — is
 * enforced in the build, and a patch applied after the build is outside it. So
 * a patch that touches a rate, a payout, or an eligibility claim has to be
 * checked in the tool by the person publishing it. The safe uses are titles,
 * descriptions, canonical links and structured data.
 *
 * **Why the whole URL is one environment variable.** The tag carries a
 * deployment id and an account key in its query string. Neither is a secret —
 * the tag is meant to be readable in the page source — but they identify the
 * owner's account, and this repository is public. Keeping the URL in
 * `.env.local` means the key is not in git and the vendor can change the
 * shape of the URL without a code change here. When it is unset, nothing
 * renders and the CSP does not name the origin either.
 *
 * **Why a plain `<script>` and not `next/script`.** React hoists an `async`
 * script with a `src` into `<head>` on its own, which is exactly what the
 * vendor's instructions ask for. `next/script`'s `beforeInteractive` would do
 * the same but only from the root layout, and its other strategies deliberately
 * delay the load until after hydration — too late for a tag whose job is to
 * change the markup a crawler reads.
 */
export function SeoTooling() {
  const src = seoToolingConfig.patchesTagSrc;
  if (!src) return null;

  // `async`, so it never blocks parsing — which is also why the Next rule
  // against synchronous scripts does not fire here.
  return <script async src={src} />;
}
