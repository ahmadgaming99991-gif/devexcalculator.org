import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { rich } from "@/i18n/rich";

/**
 * The property worth holding: the element goes where the *translation* puts
 * it, not where the English put it. Everything else here is the same contract
 * `interpolate` has, restated for a node — an unknown token stays visible, and
 * a repeated token is filled every time.
 */

const render = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);

describe("rich", () => {
  it("puts the element where the translation puts it", () => {
    const link = <a href="/sources/">Quellenverzeichnis</a>;
    const english = render(rich("linked from the {sources} before deciding", { sources: link }));
    const german = render(rich("bevor Sie entscheiden, im {sources} nachsehen", { sources: link }));

    expect(english).toBe('linked from the <a href="/sources/">Quellenverzeichnis</a> before deciding');
    expect(german).toBe('bevor Sie entscheiden, im <a href="/sources/">Quellenverzeichnis</a> nachsehen');
  });

  it("leaves an unknown token visible rather than dropping it", () => {
    // A silently missing link is a dead end nobody notices; a visible
    // `{sources}` is a bug report.
    expect(render(rich("see the {sources} page", {}))).toBe("see the {sources} page");
  });

  it("fills every occurrence of a repeated token", () => {
    const dash = <b>-</b>;
    expect(render(rich("{d} and {d}", { d: dash }))).toBe("<b>-</b> and <b>-</b>");
  });

  it("handles a token at the very start and the very end", () => {
    const a = <i>A</i>;
    expect(render(rich("{x} middle {x}", { x: a }))).toBe("<i>A</i> middle <i>A</i>");
  });

  it("returns the template unchanged when it has no tokens", () => {
    expect(render(rich("nothing to fill", { x: <i /> }))).toBe("nothing to fill");
  });
});
