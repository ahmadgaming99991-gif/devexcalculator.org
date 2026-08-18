"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { NavItem } from "@/config/navigation";
import { cx } from "@/components/ui";

/**
 * Mobile navigation.
 *
 * A client island purely because a disclosure with correct focus behaviour
 * needs it. The links inside are the same crawlable `<a href>` elements the
 * desktop navigation renders, so nothing about the site's crawl surface
 * depends on this component running.
 *
 * Behaviour required by the accessibility contract:
 *   - Escape closes the panel and returns focus to the trigger.
 *   - Focus is trapped inside the panel while it is open.
 *   - Background scrolling is locked, without the layout shifting.
 *   - The trigger reports its expanded state and the panel it controls.
 */
export function MobileNavigation({ items }: { items: readonly NavItem[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Lock background scroll while the panel is open. Compensating for the
  // scrollbar width stops the page jumping sideways as it locks.
  useEffect(() => {
    if (!open) return;
    const { body, documentElement } = document;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [open]);

  // Escape to close, Tab to cycle within the panel.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  // Move focus into the panel when it opens.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a[href]")?.focus();
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-[44px] shrink-0 items-center justify-center rounded-(--radius-control) border border-(--color-border) text-(--color-text) md:hidden"
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <svg
          className="size-5"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? (
            <path d="M5 5 15 15M15 5 5 15" />
          ) : (
            <path d="M3 6h14M3 10h14M3 14h14" />
          )}
        </svg>
      </button>

      {/* Backdrop. Presentational: Escape and the close button are the
          keyboard paths out, so this carries no interactive semantics. */}
      <div
        className={cx(
          "fixed inset-0 z-40 bg-[#0b1220]/40 md:hidden",
          open ? "block" : "hidden",
        )}
        onClick={close}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className="fixed inset-x-0 top-16 z-50 mx-3 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-3 shadow-(--shadow-raised) md:hidden"
      >
        <nav aria-label="Main">
          <ul className="flex flex-col gap-1">
            {items.map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  onClick={close}
                  className="flex min-h-[44px] flex-col justify-center rounded-(--radius-control) px-3 py-2 hover:bg-(--color-surface-subtle)"
                >
                  <span className="text-sm font-semibold text-(--color-text)">
                    {entry.label}
                  </span>
                  <span className="text-xs text-(--color-text-muted)">
                    {entry.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
