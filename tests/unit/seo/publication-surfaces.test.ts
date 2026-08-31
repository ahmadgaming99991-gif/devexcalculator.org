import { describe, expect, it, vi } from "vitest";
import { indexableRoutes } from "@/lib/content/route-registry";
import { localeRegistry } from "@/i18n/config";

/**
 * What publishing a language actually turns on.
 *
 * `visibility.ts` describes eight surfaces governed by its two questions —
 * route generation, the language selector, hreflang, the sitemap, IndexNow,
 * navigation, internal links and `llms.txt` — and says of them that "every
 * surface asks the same two questions, so there is no sixth place somebody
 * forgets".
 *
 * Three of them were not asking. `sitemap.ts`, `indexnow.ts` and `llms.ts`
 * each imported `indexableRoutes` and emitted the bare English path. A
 * published language would have rendered, been indexable, carried a correct
 * canonical and a correct hreflang cluster, and appeared in none of the three
 * files that tell a crawler it exists.
 *
 * Both halves are asserted here, because only testing one of them is how the
 * gap survived: **unchanged while nothing is published**, so this can ship
 * today without moving a single production URL, and **complete once something
 * is**, so the next person to publish a language does not have to remember
 * three files.
 */

const PUBLISHED_TODAY = localeRegistry.filter((meta) => meta.status === "published");

/** The five still in review. A prefix here must not appear on a public surface. */
const UNPUBLISHED_PREFIX = /\/(pt-br|es|id|fr|de)\//;

describe("what the published set is today", () => {
  /*
   * English and Turkish. Turkish was read by the maintainer on 2026-08-31 and
   * published on that basis (D-046); the other five have been read by nobody
   * and are `machine-drafted`.
   *
   * This assertion is meant to fail when somebody publishes a language. That
   * is its job: publishing changes eight surfaces, three of which shipped
   * without asking the visibility question at all, and a red test here is the
   * thing that makes someone read the runbook before deploying.
   */
  it("has exactly the locales somebody decided to publish", () => {
    expect(PUBLISHED_TODAY.map((meta) => meta.locale)).toEqual(["en", "tr"]);
  });

  it("lists every indexable route once per published language in the sitemap", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = sitemap();

    expect(entries).toHaveLength(indexableRoutes.length * PUBLISHED_TODAY.length);
    expect(entries.filter((entry) => entry.url.includes("/tr/"))).toHaveLength(
      indexableRoutes.length,
    );
    for (const entry of entries) {
      expect(entry.url, "an unpublished locale reached the sitemap").not.toMatch(
        UNPUBLISHED_PREFIX,
      );
    }
  });

  it("submits every published language to IndexNow, and no other", async () => {
    const { selectRoutes } = await import("@/lib/seo/indexnow");
    const routes = selectRoutes({ all: true });

    expect(routes).toHaveLength(indexableRoutes.length * PUBLISHED_TODAY.length);
    expect(routes.filter((route) => route.startsWith("/tr/"))).toHaveLength(
      indexableRoutes.length,
    );
    for (const route of routes) {
      expect(route).not.toMatch(UNPUBLISHED_PREFIX);
    }
  });

  it("names every published language in llms.txt, and no other", async () => {
    const { llmsTxt } = await import("@/lib/content/llms");
    const text = llmsTxt();

    expect(text).toContain("## Languages");
    expect(text).toContain("Turkish (Türkçe)");
    expect(text).toContain("/tr/");
    for (const meta of localeRegistry.filter((m) => m.status === "review")) {
      expect(text, `${meta.locale} is named in llms.txt`).not.toContain(`${meta.prefix}/`);
    }
  });
});

describe("when a language is published", () => {
  /*
   * The registry is read at module load, so this replaces the module rather
   * than mutating a frozen object — the same thing the release script does by
   * editing `config.ts`, without editing `config.ts`.
   */
  async function withGermanPublished<T>(read: () => Promise<T>): Promise<T> {
    vi.resetModules();
    const actual = await vi.importActual<typeof import("@/i18n/visibility")>(
      "@/i18n/visibility",
    );
    vi.doMock("@/i18n/visibility", () => ({
      ...actual,
      publicLocales: () =>
        localeRegistry.filter((meta) => meta.locale === "en" || meta.locale === "de"),
    }));
    try {
      return await read();
    } finally {
      vi.doUnmock("@/i18n/visibility");
      vi.resetModules();
    }
  }

  it("adds that language's URLs to the sitemap", async () => {
    const entries = await withGermanPublished(async () => {
      const { default: sitemap } = await import("@/app/sitemap");
      return sitemap();
    });

    expect(entries).toHaveLength(indexableRoutes.length * 2);
    const german = entries.filter((entry) => entry.url.includes("/de/"));
    expect(german).toHaveLength(indexableRoutes.length);
  });

  it("submits that language's URLs to IndexNow", async () => {
    const routes = await withGermanPublished(async () => {
      const { selectRoutes } = await import("@/lib/seo/indexnow");
      return selectRoutes({ all: true });
    });

    expect(routes).toHaveLength(indexableRoutes.length * 2);
    expect(routes.filter((route) => route.startsWith("/de/"))).toHaveLength(
      indexableRoutes.length,
    );
  });

  it("names that language in llms.txt", async () => {
    const text = await withGermanPublished(async () => {
      const { llmsTxt } = await import("@/lib/content/llms");
      return llmsTxt();
    });

    expect(text).toContain("## Languages");
    expect(text).toContain("German (Deutsch)");
    expect(text).toContain("/de/");
  });
});
