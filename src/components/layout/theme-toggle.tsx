"use client";

import { useState } from "react";
import { useClientValue } from "@/lib/utilities/use-client-value";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "devex:theme";

/**
 * Theme toggle.
 *
 * Cycles light → dark → system. "System" is a real third state rather than an
 * implicit default, so a reader who wants to follow their OS can get back to
 * that after trying the other two.
 *
 * The current theme is read from the `data-theme` attribute the inline head
 * script has already applied, rather than from React state seeded in an
 * effect. That keeps the button's label correct on first paint and avoids a
 * cascading render on mount.
 */
export function ThemeToggle() {
  // Reflects a choice made in this session; before that, the DOM is the truth.
  const [chosen, setChosen] = useState<Theme | null>(null);

  const applied = useClientValue(
    () => document.documentElement.getAttribute("data-theme") ?? "system",
    "system",
  );

  const theme: Theme = chosen ?? (applied === "light" || applied === "dark" ? applied : "system");
  const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";

  function apply(value: Theme) {
    setChosen(value);
    const root = document.documentElement;
    try {
      if (value === "system") {
        root.removeAttribute("data-theme");
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        root.setAttribute("data-theme", value);
        window.localStorage.setItem(STORAGE_KEY, value);
      }
    } catch {
      // Storage can be unavailable in private modes. The attribute is still
      // applied, so the theme works for this page view.
    }
  }

  const label = `Theme: ${theme}. Switch to ${next}.`;

  return (
    <button
      type="button"
      onClick={() => apply(next)}
      className="inline-flex size-11 items-center justify-center rounded-[--radius-control] border border-[--color-border] text-[--color-text-muted] hover:text-[--color-text]"
      title={label}
    >
      <span className="sr-only">{label}</span>
      <svg
        className="size-5"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        {theme === "dark" ? (
          <path
            d="M16 11.5A6.5 6.5 0 0 1 8.5 4a6.5 6.5 0 1 0 7.5 7.5Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : theme === "light" ? (
          <>
            <circle cx="10" cy="10" r="3.5" />
            <path
              d="M10 2v1.5M10 16.5V18M18 10h-1.5M3.5 10H2M15.7 4.3l-1 1M5.3 14.7l-1 1M15.7 15.7l-1-1M5.3 5.3l-1-1"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <rect x="2.5" y="4" width="15" height="10" rx="2" />
            <path d="M7 17h6" strokeLinecap="round" />
          </>
        )}
      </svg>
    </button>
  );
}

/**
 * Inline script that applies the stored theme before first paint.
 *
 * This has to run synchronously in the document head. Anything later — a React
 * effect, a deferred script — paints the default theme first and then corrects
 * it, which readers see as a flash.
 */
export const themeInitScript = `
(function(){try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();
`.trim();
