"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "devex:theme";

/**
 * Theme toggle.
 *
 * Cycles light → dark → system. "System" is a real third state rather than an
 * implicit default, so a reader who wants to follow their OS can get back to
 * that after trying the other two.
 *
 * The button renders a stable placeholder until mounted. Reading localStorage
 * during render would produce different markup on the server and the client;
 * the inline script in the document head is what prevents a flash of the wrong
 * theme, not this component.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") setTheme(stored);
    } catch {
      // Storage can be unavailable in private modes; the default stands.
    }
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    const root = document.documentElement;
    if (next === "system") {
      root.removeAttribute("data-theme");
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    } else {
      root.setAttribute("data-theme", next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
    }
  }

  const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const label = mounted
    ? `Theme: ${theme}. Switch to ${next}.`
    : "Change colour theme";

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
        {mounted && theme === "dark" ? (
          <path
            d="M16 11.5A6.5 6.5 0 0 1 8.5 4a6.5 6.5 0 1 0 7.5 7.5Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : mounted && theme === "light" ? (
          <>
            <circle cx="10" cy="10" r="3.5" />
            <path d="M10 2v1.5M10 16.5V18M18 10h-1.5M3.5 10H2M15.7 4.3l-1 1M5.3 14.7l-1 1M15.7 15.7l-1-1M5.3 5.3l-1-1" strokeLinecap="round" />
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
