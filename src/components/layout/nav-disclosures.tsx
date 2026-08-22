"use client";

import { useEffect, useRef } from "react";

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
 * It wraps server-rendered children and touches them through the DOM instead
 * of owning them, so nothing here re-renders and no page content is pulled
 * into the client bundle to get this behaviour.
 */
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

    // `toggle` does not bubble, so this listens in the capture phase — the
    // event still travels down to its target, which is enough to see it.
    function onToggle(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLDetailsElement)) return;
      if (target.open) closeAll(target);
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

    root.addEventListener("toggle", onToggle, true);
    root.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      root.removeEventListener("toggle", onToggle, true);
      root.removeEventListener("click", onClick);
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
