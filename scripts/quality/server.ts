import { execFileSync, spawn, type ChildProcess } from "node:child_process";
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
      stopTree(child);
      // Give the process a moment to release the port before the next check.
      await new Promise((resolve) => setTimeout(resolve, 300));
    },
  };
}

/**
 * Ends the spawned server and everything beneath it.
 *
 * On Windows the child is a `cmd.exe` wrapper — `shell: true` is what makes
 * `npx.cmd` runnable at all — and killing it leaves the `next start` under it
 * still holding the port. The next check then cannot bind, waits out the full
 * ninety seconds, and leaves an orphan of its own, so a single failure turns
 * every later run into a failure too. `taskkill /T` takes the whole tree.
 */
function stopTree(child: ChildProcess): void {
  if (process.platform === "win32" && child.pid !== undefined) {
    try {
      execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      return;
    } catch {
      // Already gone, or never started; fall through to the portable path.
    }
  }
  child.kill();
}

/**
 * Waits until the server answers, not until it is content.
 *
 * `/api/health/` returns 503 when the rate registry is due for review or the
 * collector has stopped recording, which is true of any machine not running
 * the cron — every developer's. That is the right answer for an uptime monitor
 * and the wrong question here: these checks crawl routes, links and metadata,
 * and none of them reads a collected observation. Requiring a 200 meant the
 * crawl checks could not run locally at all, so the probe is now "did anything
 * serve this", and a degraded status is printed rather than waited out.
 */
async function waitForServer(baseUrl: string): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health/`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (!response.ok) {
        console.log(
          `Server is up; health reports ${await describeHealth(response)}. ` +
            `Continuing — these checks do not read collected data.`,
        );
      }
      return;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server at ${baseUrl} did not become ready within ${STARTUP_TIMEOUT_MS}ms`);
}

/** Names what a degraded health response is unhappy about, for the line above. */
async function describeHealth(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      status?: unknown;
      collector?: { state?: unknown };
    };
    const overall = typeof body.status === "string" ? body.status : String(response.status);
    const collector =
      typeof body.collector?.state === "string" ? body.collector.state : null;
    return collector ? `${overall} (collector ${collector})` : overall;
  } catch {
    return String(response.status);
  }
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
