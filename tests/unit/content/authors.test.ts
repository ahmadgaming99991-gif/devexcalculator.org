import { describe, expect, it } from "vitest";
import {
  AHMAD_RAZA,
  SAEED_AHMED,
  findPerson,
  people,
  personRoute,
} from "../../../src/lib/content/authors";
import { routeRegistry } from "../../../src/lib/content/route-registry";

/**
 * A byline is a trust signal, so the tests here are mostly about what must NOT
 * appear: a reviewer on a page nobody reviewed, a face nobody supplied, an
 * address nobody gave, or a tracking parameter riding along on a profile link.
 */

describe("the people data", () => {
  it("holds exactly the two real people, with distinct slugs", () => {
    expect(people).toHaveLength(2);
    expect(new Set(people.map((p) => p.slug)).size).toBe(2);
    expect(people.filter((p) => p.kind === "author")).toHaveLength(1);
    expect(people.filter((p) => p.kind === "reviewer")).toHaveLength(1);
  });

  it("carries no tracking parameters on any profile link", () => {
    // Share links from LinkedIn and X arrive with `?utm_*` and `?s=`, which
    // tell the destination where the reader came from. Nobody's business here.
    for (const person of people) {
      for (const url of person.sameAs) {
        expect(url, `${person.slug}: ${url}`).not.toMatch(/[?&](utm_[a-z]+|s|si|igsh|fbclid)=/);
        expect(url).not.toContain("?");
        expect(url.startsWith("https://"), `${url} is not https`).toBe(true);
      }
    }
  });

  it("gives the reviewer no photograph and no invented address", () => {
    // No portrait was supplied. An initials avatar is the honest answer; a
    // stock photo under a real person's name is not.
    expect(SAEED_AHMED.avatar).toBeNull();
    expect(SAEED_AHMED.initials).toBe("SA");
    expect(SAEED_AHMED.email).toBeNull();
  });

  it("describes the reviewer by the process he runs, not by expertise he was never claimed to have", () => {
    const bio = SAEED_AHMED.bio.toLowerCase();
    // His public profiles read as a developer. Presenting him as a Roblox or
    // finance authority would be exactly the fabrication this site avoids.
    for (const claim of [
      "roblox expert",
      "gaming industry",
      "industry analyst",
      "financial analyst",
      "financial specialist",
      "authority on",
    ]) {
      expect(bio, `bio claims "${claim}"`).not.toContain(claim);
    }
    // What it does say is the checking process.
    expect(bio).toContain("primary source");
  });

  it("resolves a slug, and refuses one it does not know", () => {
    expect(findPerson("ahmad-raza")).toBe(AHMAD_RAZA);
    expect(findPerson("saeed-ahmed")).toBe(SAEED_AHMED);
    expect(findPerson("someone-else")).toBeNull();
    expect(findPerson("")).toBeNull();
  });

  it("builds profile routes with the site's trailing slash", () => {
    expect(personRoute(AHMAD_RAZA)).toBe("/authors/ahmad-raza/");
    expect(personRoute(SAEED_AHMED)).toBe("/authors/saeed-ahmed/");
  });
});

describe("per-page review flags", () => {
  it("never carries one half of a review credit without the other", () => {
    // A reviewer with no date is a claim with nothing behind it; a date with
    // no reviewer names nobody. Both, or neither.
    for (const route of routeRegistry) {
      const hasWho = typeof route.reviewedBy === "string" && route.reviewedBy !== "";
      const hasWhen = typeof route.reviewedAt === "string" && route.reviewedAt !== "";
      expect(hasWho, `${route.route} has a review date but no reviewer`).toBe(hasWhen);
    }
  });

  it("only ever names a person who exists", () => {
    for (const route of routeRegistry) {
      if (!route.reviewedBy) continue;
      expect(findPerson(route.reviewedBy), `${route.route} names an unknown reviewer`).not.toBeNull();
    }
  });

  it("uses a real date, never a build-time now()", () => {
    for (const route of routeRegistry) {
      if (!route.reviewedAt) continue;
      expect(route.reviewedAt, `${route.route}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(route.reviewedAt))).toBe(false);
    }
  });

  it("carries a review credit on no page yet", () => {
    // The owner sets these deliberately, page by page, as reviews happen.
    // Until then the honest count is zero, and this test is what stops a
    // well-meaning default from quietly making it non-zero.
    const reviewed = routeRegistry.filter((route) => route.reviewedBy);
    expect(reviewed.map((route) => route.route)).toEqual([]);
  });
});
