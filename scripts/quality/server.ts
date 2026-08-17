import { spawn, type ChildProcess } from "node:child_process";
import { REPO_ROOT } from "../seo/paths";

/**
 * Starts a production server for the crawl-based checks, or reuses one.
 *
 * Set `BASE_URL` to point the checks at an already-running server — a Workers
 * preview, or a deployed environment. With it unset, a local `next start` is
 * spawned and torn down afterwards.
 */

export interface RunningServer {
  readonly baseUrl: string;
  readonly stop: () => Promise<void>;
}

const DEFAULT_PORT = 3210;
const STARTUP_TIMEOUT_MS = 90_000;

export async function startServer(): Promise<RunningServer> {
  const existing = process.env.BASE_URL?.trim();
  if (existing) {
    const baseUrl = existing.replace(/\/$/, "");
    console.log(`Using existing server at ${baseUrl}`);
    await waitForServer(baseUrl);
    return { baseUrl, stop: async () => {} };
  }

  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Starting next start on port ${port}…`);

  const child: ChildProcess = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["next", "start", "--port", String(port)],
    { cwd: REPO_ROOT, stdio: "ignore", shell: process.platform === "win32" },
  );

  await waitForServer(baseUrl);

  return {
    baseUrl,
    stop: async () => {
      child.kill();
      // Give the process a moment to release the port before the next check.
      await new Promise((resolve) => setTimeout(resolve, 300));
    },
  };
}

async function waitForServer(baseUrl: string): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health/`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server at ${baseUrl} did not become ready within ${STARTUP_TIMEOUT_MS}ms`);
}

/** Extracts every `href` from an HTML document. */
export function extractHrefs(html: string): string[] {
  const hrefs: string[] = [];
  const pattern = /<a\b[^>]*\shref=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    if (match[1]) hrefs.push(match[1]);
  }
  return hrefs;
}

/** Reads the content of a `<meta>` tag by name or property. */
export function extractMeta(html: string, key: string): string | null {
  const byName = html.match(
    new RegExp(`<meta[^>]*\\sname=["']${key}["'][^>]*\\scontent=["']([^"']*)["']`, "i"),
  );
  if (byName?.[1] !== undefined) return byName[1];
  const byProperty = html.match(
    new RegExp(`<meta[^>]*\\sproperty=["']${key}["'][^>]*\\scontent=["']([^"']*)["']`, "i"),
  );
  if (byProperty?.[1] !== undefined) return byProperty[1];
  // Attribute order is not guaranteed, so try content-first as well.
  const contentFirst = html.match(
    new RegExp(`<meta[^>]*\\scontent=["']([^"']*)["'][^>]*\\s(?:name|property)=["']${key}["']`, "i"),
  );
  return contentFirst?.[1] ?? null;
}

export function extractTitle(html: string): string | null {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null;
}

export function extractCanonical(html: string): string | null {
  return (
    html.match(/<link[^>]*\srel=["']canonical["'][^>]*\shref=["']([^"']+)["']/i)?.[1] ??
    html.match(/<link[^>]*\shref=["']([^"']+)["'][^>]*\srel=["']canonical["']/i)?.[1] ??
    null
  );
}

export function extractH1s(html: string): string[] {
  const matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  return matches.map((match) => (match[1] ?? "").replace(/<[^>]+>/g, "").trim());
}

/** Extracts every JSON-LD block, parsed. */
export function extractJsonLd(html: string): unknown[] {
  const matches = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  return matches.map((match) => JSON.parse(match[1] ?? "null"));
}
