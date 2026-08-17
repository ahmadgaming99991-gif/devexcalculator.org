import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** Repository root, resolved from this file rather than the process cwd. */
export const REPO_ROOT = resolve(here, "..", "..");

export const SEO_DIR = join(REPO_ROOT, "seo");
export const SEO_SOURCE = join(SEO_DIR, "source");
export const SEO_OVERRIDES = join(SEO_DIR, "overrides");
export const SEO_GENERATED = join(SEO_DIR, "generated");
export const DOCS_DIR = join(REPO_ROOT, "docs");
export const DOCS_SEO_DIR = join(DOCS_DIR, "seo");
export const SRC_DIR = join(REPO_ROOT, "src");
export const APP_DIR = join(SRC_DIR, "app");
export const PUBLIC_DIR = join(REPO_ROOT, "public");
