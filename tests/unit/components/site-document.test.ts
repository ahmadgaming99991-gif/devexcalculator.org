import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The shell must not render `<head>` itself.
 *
 * In the App Router that element belongs to Next: it streams the stylesheet
 * links, the metadata, the preloads and the chunk scripts into it. A layout
 * that renders its own `<head>` hands React a head with one child while the
 * DOM has forty, and React resolves that by throwing away the entire
 * server-rendered document and rebuilding it in the browser — `Minified React
 * error #418`, intermittently, on every route, in both Firefox and Chrome.
 *
 * `suppressHydrationWarning` on `<html>` does not cover it: that suppresses a
 * mismatch in that element's own attributes and text, not a structural one
 * inside it.
 *
 * The error needs warm chunks, and therefore fast hydration, to appear at all,
 * which is why a cold first load rarely shows it and why it survived until a
 * full-site audit went looking. A source check is the guard that would have
 * caught it, because no rendered-output check can: the served HTML is correct.
 */

const SHELL = "src/components/layout/site-document.tsx";

/** The source with its comments removed — they name the very thing forbidden. */
const code = (path: string) =>
  readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("the document shell", () => {
  const source = code(SHELL);

  it("does not render a <head> element", () => {
    expect(source).not.toMatch(/<head[\s>]/);
    expect(source).not.toMatch(/<\/head>/);
  });

  it("still renders html and body itself", () => {
    // Without these the assertion above would pass on an empty file.
    expect(source).toMatch(/<html\b/);
    expect(source).toMatch(/<body\b/);
  });

  it("keeps the theme script before any content, so there is no flash", () => {
    // The JSX, not the import at the top of the file.
    const body = source.indexOf("<body");
    const script = source.indexOf("dangerouslySetInnerHTML={{ __html: themeInitScript }}");
    const chrome = source.indexOf("<SiteChrome");
    expect(script, "theme script is present").toBeGreaterThan(-1);
    expect(script, "after <body>").toBeGreaterThan(body);
    expect(script, "before the page content").toBeLessThan(chrome);
  });

  it("keeps suppressHydrationWarning on html, which the theme script mutates", () => {
    expect(source).toMatch(/<html[^>]*suppressHydrationWarning/s);
  });
});
