/**
 * Local-only preferences and calculation history.
 *
 * Everything here stays in the reader's own browser. Nothing is synced, no
 * account exists, and no calculation is ever sent to a server — which is
 * exactly what the privacy policy says, so the two must stay true together.
 *
 * Every access is wrapped: localStorage throws in private browsing modes and
 * when a site is denied storage, and a calculator that crashes because someone
 * has cookies disabled would be a poor trade for a convenience feature.
 */

const PREFERENCES_KEY = "devex:preferences";
const HISTORY_KEY = "devex:history";
const MAX_HISTORY_ENTRIES = 10;

export interface Preferences {
  readonly currency: string;
  readonly advancedOpen: boolean;
  readonly lastRateId: string;
}

export interface HistoryEntry {
  readonly id: string;
  readonly label: string;
  readonly result: string;
  readonly query: string;
  readonly savedAt: string;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Quota exceeded or storage denied. The calculator keeps working.
    return false;
  }
}

export function loadPreferences(): Partial<Preferences> {
  const stored = readJson<Partial<Preferences>>(PREFERENCES_KEY, {});
  // Validate rather than trusting whatever is in storage: it may be stale
  // from an older version of the site or edited by hand.
  return {
    ...(typeof stored.currency === "string" ? { currency: stored.currency } : {}),
    ...(typeof stored.advancedOpen === "boolean" ? { advancedOpen: stored.advancedOpen } : {}),
    ...(typeof stored.lastRateId === "string" ? { lastRateId: stored.lastRateId } : {}),
  };
}

export function savePreferences(preferences: Partial<Preferences>): void {
  const merged = { ...loadPreferences(), ...preferences };
  writeJson(PREFERENCES_KEY, merged);
}

export function loadHistory(): HistoryEntry[] {
  const stored = readJson<HistoryEntry[]>(HISTORY_KEY, []);
  if (!Array.isArray(stored)) return [];
  return stored
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry?.id === "string" &&
        typeof entry?.label === "string" &&
        typeof entry?.result === "string",
    )
    .slice(0, MAX_HISTORY_ENTRIES);
}

/**
 * Adds an entry, replacing any identical previous calculation so repeatedly
 * adjusting one figure does not fill the list with near-duplicates.
 */
export function addHistoryEntry(entry: Omit<HistoryEntry, "id" | "savedAt">): HistoryEntry[] {
  const existing = loadHistory().filter((item) => item.query !== entry.query);
  const next: HistoryEntry[] = [
    {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      savedAt: new Date().toISOString(),
    },
    ...existing,
  ].slice(0, MAX_HISTORY_ENTRIES);
  writeJson(HISTORY_KEY, next);
  return next;
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* nothing to clear */
  }
}

/** Whether local storage is usable at all, for honest UI messaging. */
export function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probe = "devex:probe";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
