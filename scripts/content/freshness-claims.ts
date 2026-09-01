/**
 * Request-time freshness claims, and why they are banned on `/platform/`.
 *
 * The figures on `/platform/` are collected on a schedule and stored. Nothing
 * is fetched because a reader opened the page, so a sentence dating a volatile
 * figure to the reader's own instant — "right now", "at the moment this page
 * was served", "in real time" — is a false statement about how the site works.
 *
 * This module exists because the first pass at removing those claims matched
 * two literal phrases and checked only the English route registry. Every
 * locale's table caption still said the players were counted "at the moment
 * this page was served", in seven languages, and nothing failed. A validator
 * that knows only the exact wording of the mistake it already found is not a
 * validator.
 *
 * What is deliberately NOT banned:
 *
 *   - FAQ *questions*. "How many people are playing Roblox right now?" is how
 *     a reader asks, not what this site claims; the answer does the correcting.
 *   - Keyword and intent fields. They record what people search for.
 *   - "Live figures" as a heading immediately followed by the sentence giving
 *     the collection interval. A word about freshness is fair when the
 *     freshness is stated beside it; only an unqualified claim about the
 *     reader's own instant is not.
 */
import { readFileSync } from "node:fs";
import { routeRegistry } from "../../src/lib/content/route-registry";

export const LOCALES = ["en", "de", "es", "fr", "id", "pt-BR", "tr"] as const;
export type Locale = (typeof LOCALES)[number];

/** The `/platform/` namespaces. `stock` and `stats` describe other pages. */
export const PLATFORM_NAMESPACES = [
  "live",
  "platformFigure",
  "history",
  "method",
  "download",
  "dashboard",
  "limits",
] as const;

/** Fields that record a reader's phrasing or a search query, not a claim. */
const SKIPPED_KEYS = new Set([
  "question",
  "primaryIntent",
  "primaryKeyword",
  "secondaryKeywords",
  "entities",
  "$comment",
]);

interface Ban {
  readonly pattern: RegExp;
  readonly locales: readonly Locale[] | "all";
  readonly why: string;
}

export const BANS: readonly Ban[] = [
  // The mechanism claim, in every spelling it has taken so far.
  {
    pattern: /\b(at|in) the moment (this|the) page (was|is) (served|loaded|rendered)/i,
    locales: "all",
    why: "Nothing is fetched because a page was served.",
  },
  {
    pattern: /\bwhen (this|the) page (is|was) (served|loaded|rendered)/i,
    locales: "all",
    why: "Nothing is fetched because a page was served.",
  },
  {
    pattern: /\breal[- ]?time\b/i,
    locales: "all",
    why: "Observations are scheduled, not real-time.",
  },

  // English.
  {
    pattern: /\bright now\b/i,
    locales: ["en"],
    why: "Dates a scheduled figure to the reader's own instant.",
  },
  {
    pattern: /\bas you (read|watch) this\b/i,
    locales: ["en"],
    why: "Implies a reading taken as the reader looks.",
  },
  {
    pattern: /\bup[- ]to[- ]the[- ]minute\b/i,
    locales: ["en"],
    why: "The collection interval is 15 minutes.",
  },
  {
    pattern: /\bat this (very )?moment\b/i,
    locales: ["en"],
    why: "Dates a scheduled figure to the reader's own instant.",
  },
  {
    pattern: /\bplayers now\b/i,
    locales: ["en"],
    why: "A column of scheduled observations, not of present values.",
  },

  // German.
  {
    pattern: /gerade jetzt|in diesem Moment|Echtzeit/i,
    locales: ["de"],
    why: "German request-time claim.",
  },
  {
    pattern: /ausgeliefert wurde|beim Aufruf (dieser|der) Seite/i,
    locales: ["de"],
    why: "German page-served claim.",
  },

  // Spanish.
  {
    pattern: /ahora mismo|en este momento|en tiempo real/i,
    locales: ["es"],
    why: "Spanish request-time claim.",
  },
  {
    pattern: /se sirvi(ó|o) esta p(á|a)gina/i,
    locales: ["es"],
    why: "Spanish page-served claim.",
  },

  // French.
  {
    pattern: /en ce moment|en temps r(é|e)el|(à|a) l'instant m(ê|e)me/i,
    locales: ["fr"],
    why: "French request-time claim.",
  },
  {
    pattern: /cette page a (é|e)t(é|e) servie/i,
    locales: ["fr"],
    why: "French page-served claim.",
  },

  // Indonesian.
  {
    pattern: /sekarang juga|saat ini juga|waktu nyata/i,
    locales: ["id"],
    why: "Indonesian request-time claim.",
  },
  {
    pattern: /halaman ini disajikan|halaman ini dimuat/i,
    locales: ["id"],
    why: "Indonesian page-served claim.",
  },

  // Portuguese.
  {
    pattern: /agora mesmo|neste momento|em tempo real/i,
    locales: ["pt-BR"],
    why: "Portuguese request-time claim.",
  },
  {
    pattern: /esta p(á|a)gina foi servida|no momento em que esta p(á|a)gina/i,
    locales: ["pt-BR"],
    why: "Portuguese page-served claim.",
  },

  // Turkish.
  {
    pattern: /şu an(da|ki)?\b|gerçek zamanlı/i,
    locales: ["tr"],
    why: "Turkish request-time claim.",
  },
  {
    pattern: /sayfan(ı|i)n sunulduğu|sayfa sunulduğunda/i,
    locales: ["tr"],
    why: "Turkish page-served claim.",
  },
];

export interface Finding {
  readonly where: string;
  readonly text: string;
  readonly why: string;
  readonly pattern: string;
}

/** Every string on the `/platform/` surface, with the path that names it. */
function collect(node: unknown, path: string, out: { path: string; text: string }[]): void {
  if (typeof node === "string") {
    out.push({ path, text: node });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, index) => collect(item, `${path}[${index}]`, out));
    return;
  }
  if (node !== null && typeof node === "object") {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (SKIPPED_KEYS.has(key)) continue;
      collect(value, path === "" ? key : `${path}.${key}`, out);
    }
  }
}

/** Applies the bans that are in force for one language to one string. */
export function claimsIn(text: string, locale: Locale, where: string): Finding[] {
  const findings: Finding[] = [];
  for (const ban of BANS) {
    if (ban.locales !== "all" && !ban.locales.includes(locale)) continue;
    if (ban.pattern.test(text)) {
      findings.push({ where, text, why: ban.why, pattern: String(ban.pattern) });
    }
  }
  return findings;
}

/** Scans all seven locale catalogues and the English route registry. */
export function scanFreshnessClaims(root = "."): Finding[] {
  const findings: Finding[] = [];

  for (const locale of LOCALES) {
    const strings: { path: string; text: string }[] = [];

    const platform = JSON.parse(
      readFileSync(`${root}/src/i18n/locales/${locale}/platform.json`, "utf8"),
    ) as Record<string, unknown>;
    for (const namespace of PLATFORM_NAMESPACES) {
      collect(platform[namespace], `platform.${namespace}`, strings);
    }

    const routes = JSON.parse(
      readFileSync(`${root}/src/i18n/locales/${locale}/routes.json`, "utf8"),
    ) as { platform?: unknown };
    collect(routes.platform, "routes.platform", strings);

    for (const { path, text } of strings) {
      findings.push(...claimsIn(text, locale, `${locale}: ${path}`));
    }
  }

  // The registry is the English source the localized catalogues are drawn from.
  const record = routeRegistry.find((entry) => entry.route === "/platform/");
  const registryStrings: { path: string; text: string }[] = [];
  collect(record, "registry", registryStrings);
  for (const { path, text } of registryStrings) {
    findings.push(...claimsIn(text, "en", `registry: ${path}`));
  }

  return findings;
}
