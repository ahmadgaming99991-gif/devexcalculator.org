"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/track";

/**
 * Keyboard and pointer behaviour for the header's menus.
 *
 * The menus themselves are native `<details>` elements rendered on the server,
 * so they open, close and take keyboard focus with no JavaScript at all. That
 * is the whole reason for building them that way: a reader with scripts
 * blocked gets working navigation rather than a dead button, and a crawler
 * sees every destination in the HTML whether a panel is open or not.
 *
 * Three things a bare `<details>` still does not do, which this adds:
 *
 *   - Escape closes the open menu and returns focus to its own trigger.
 *   - A pointer press anywhere outside closes it. Without this a menu opened
 *     by accident follows the reader down the page.
 *   - Opening one closes the others. The `name` attribute already does this in
 *     current browsers; this covers the ones where it does not, and is the
 *     reason the exclusive behaviour can be relied on rather than hoped for.
 *
 *   - On a device with a real mouse, hovering a trigger opens it. See
 *     `HOVER_QUERY` below for why that is gated and not simply always on.
 *
 * It wraps server-rendered children and touches them through the DOM instead
 * of owning them, so nothing here re-renders and no page content is pulled
 * into the client bundle to get this behaviour.
 */

/**
 * Which pointers get hover-to-open.
 *
 * `hover: hover` alone is not enough. Several touch browsers report it true
 * because they emulate a hover on tap, and on those a hover menu opens on the
 * first tap and swallows the second — the reader taps the trigger, the panel
 * appears under their finger, and the tap that was meant to open the menu has
 * already been spent. `pointer: fine` restricts this to an actual pointing
 * device, which leaves touch on the click behaviour that works there.
 *
 * Read at event time rather than once on mount, so a convertible laptop that
 * folds into a tablet is answered with what is true now.
 */
const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

/** Long enough that crossing a trigger on the way elsewhere does not open it. */
const OPEN_DELAY_MS = 90;

/**
 * Long enough to cross the gap between a trigger and its panel, and to clip a
 * corner on the way in. The CSS hover bridge covers the gap itself; this
 * covers the reader who leaves the menu and comes straight back.
 */
const CLOSE_DELAY_MS = 220;
export function NavDisclosures({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const panels = () =>
      Array.from(root.querySelectorAll<HTMLDetailsElement>("details[data-nav-menu]"));

    function closeAll(except?: HTMLDetailsElement) {
      for (const panel of panels()) {
        if (panel !== except) panel.open = false;
      }
    }

    /**
     * How the menu about to report itself was opened.
     *
     * Hovering a trigger now opens it, and a hover is a far weaker statement
     * of interest than a click: a reader crossing the header on the way to the
     * language switcher passes three of them. Recording both under one event
     * would bury the deliberate opens in accidental ones and quietly make the
     * grouping metric useless. Set immediately before `open` is assigned, read
     * once, and reset — a toggle this code did not cause is "direct".
     */
    let openedBy: "hover" | "direct" = "direct";

    // `toggle` does not bubble, so this listens in the capture phase — the
    // event still travels down to its target, which is enough to see it.
    function onToggle(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLDetailsElement)) return;
      const method = openedBy;
      openedBy = "direct";
      if (!target.open) return;
      closeAll(target);
      // Which groups readers open is the one thing that says whether this
      // grouping matches how they think about the site.
      track("navigation_group_opened", {
        nav_group: target.querySelector("summary")?.textContent?.trim(),
        opened_by: method,
      });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const open = panels().find((panel) => panel.open);
      if (!open) return;
      event.preventDefault();
      open.open = false;
      // Focus goes back to the trigger the reader opened, not to the top of
      // the page — otherwise Escape costs them their place in the tab order.
      open.querySelector<HTMLElement>("summary")?.focus();
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && root?.contains(target)) return;
      closeAll();
    }

    // A click on a destination closes the menu behind it. Client-side
    // navigation leaves the DOM in place, so without this the panel would
    // still be hanging open over the page the reader just asked for.
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("a[href]")) closeAll();
    }

    // -- Hover to open, on pointing devices only ---------------------------

    let timer: ReturnType<typeof setTimeout> | undefined;

    /**
     * The menu the reader has just closed with a deliberate click.
     *
     * Without this, clicking an open trigger closes it and the pointer — still
     * sitting on that same trigger — immediately reopens it. The menu would be
     * impossible to dismiss by clicking, which is the one gesture every reader
     * tries first. Cleared when the pointer actually leaves.
     */
    let dismissed: HTMLDetailsElement | null = null;

    const usesHover = () => window.matchMedia(HOVER_QUERY).matches;

    function cancelPending() {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    }

    function menuFrom(event: Event): HTMLDetailsElement | null {
      const target = event.target;
      if (!(target instanceof Element)) return null;
      return target.closest<HTMLDetailsElement>("details[data-nav-menu]");
    }

    function onPointerOver(event: PointerEvent) {
      // `pointerover` fires for touch too, just before the tap. Leaving it to
      // the click keeps the tap doing exactly one thing.
      if (event.pointerType !== "mouse" || !usesHover()) return;
      const menu = menuFrom(event);
      if (!menu || menu === dismissed) return;

      cancelPending();
      if (menu.open) return;
      timer = setTimeout(() => {
        // `onToggle` does the mutual exclusion; this only has to open it.
        openedBy = "hover";
        menu.open = true;
      }, OPEN_DELAY_MS);
    }

    function onPointerOut(event: PointerEvent) {
      if (event.pointerType !== "mouse" || !usesHover()) return;
      const menu = menuFrom(event);
      if (!menu) return;

      // `pointerout` also fires when moving between two elements inside the
      // same menu. Only a pointer that has actually left it should close it.
      const next = event.relatedTarget;
      if (next instanceof Node && menu.contains(next)) return;

      if (menu === dismissed) dismissed = null;

      cancelPending();
      timer = setTimeout(() => {
        /*
         * Not if the keyboard is in there. A reader who tabbed into a panel
         * and then happened to move the mouse would otherwise have the menu
         * shut on them, taking their focus with it.
         */
        if (menu.contains(document.activeElement)) return;
        menu.open = false;
      }, CLOSE_DELAY_MS);
    }

    /** A click on the trigger stays authoritative over anything hover wants. */
    function onSummaryPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const summary = target.closest("summary");
      if (!summary) return;
      const menu = summary.closest<HTMLDetailsElement>("details[data-nav-menu]");
      if (!menu) return;

      cancelPending();
      // `open` is still the pre-click value here; the toggle happens after.
      dismissed = menu.open ? menu : null;
    }

    root.addEventListener("toggle", onToggle, true);
    root.addEventListener("click", onClick);
    root.addEventListener("pointerover", onPointerOver);
    root.addEventListener("pointerout", onPointerOut);
    root.addEventListener("pointerdown", onSummaryPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      cancelPending();
      root.removeEventListener("toggle", onToggle, true);
      root.removeEventListener("click", onClick);
      root.removeEventListener("pointerover", onPointerOver);
      root.removeEventListener("pointerout", onPointerOut);
      root.removeEventListener("pointerdown", onSummaryPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
