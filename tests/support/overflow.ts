import type { Page } from "@playwright/test";

/**
 * Measures horizontal overflow and names what is causing it.
 *
 * A bare "expected 0, received 6" from a CI machine nobody can open is close to
 * useless: two real layout defects on this project were mistaken for CI
 * flakiness because the failure said nothing about which element was too wide.
 * The offender list is what turns that into a diagnosis.
 *
 * Elements inside their own horizontal scroller are ignored. A wide table in an
 * `overflow-x: auto` wrapper is contained by design, and listing it buries the
 * element actually pushing the page.
 */
export interface OverflowReport {
  readonly overflow: number;
  readonly viewport: number;
  readonly offenders: readonly string[];
}

export async function measureOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate(() => {
    const root = document.documentElement;
    const viewport = root.clientWidth;

    const isScrollable = (element: Element): boolean => {
      for (let node: Element | null = element; node; node = node.parentElement) {
        const overflowX = getComputedStyle(node).overflowX;
        if (overflowX === "auto" || overflowX === "scroll") return true;
      }
      return false;
    };

    const offenders = [...document.querySelectorAll("body *")]
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ element, rect }) => rect.right > viewport + 1 && !isScrollable(element))
      .sort((a, b) => b.rect.right - a.rect.right)
      .slice(0, 5)
      .map(({ element, rect }) => {
        const classes = (element.className?.toString?.() ?? "").slice(0, 70);
        const text = (element.textContent ?? "").trim().slice(0, 30);
        return (
          `<${element.tagName.toLowerCase()} class="${classes}"> ` +
          `width=${Math.round(rect.width)} right=${Math.round(rect.right)} "${text}"`
        );
      });

    return { overflow: root.scrollWidth - viewport, viewport, offenders };
  });
}

/** A failure message that says what to go and look at. */
export function describeOverflow(label: string, report: OverflowReport): string {
  return (
    `${label} is ${report.overflow}px wider than its ${report.viewport}px viewport. ` +
    `Widest elements: ${report.offenders.join(" | ") || "none found outside a scroller"}`
  );
}
