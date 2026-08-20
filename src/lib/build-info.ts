/**
 * Which build is running.
 *
 * `siteConfig.version` used to hold these, read from `NEXT_PUBLIC_COMMIT_SHA`
 * and `NEXT_PUBLIC_BUILD_TIME`. Nothing ever set either, so the health endpoint
 * reported `"commit": null` on every deploy the site has ever had — a field
 * that looked like build provenance and carried none. There was no way to
 * confirm which commit was actually serving.
 *
 * Two things changed. The values are now filled in by `next.config.ts` at build
 * time, from CI's commit SHA or from `git rev-parse` on a local deploy. And
 * they moved out of `siteConfig`, which is imported by client components: a
 * timestamp that changes on every build, inlined into a module the browser
 * bundle pulls in, would rewrite the hash of a chunk whose code had not changed
 * and expire every visitor's cached JavaScript for nothing.
 *
 * So this module is server-only by convention — imported by `/api/health/` and
 * nowhere a browser can reach. Both values are optional and null when unknown,
 * because a build with no git and no CI is a legitimate way to run this.
 */

function readBuildEnv(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const buildInfo = {
  /** Full commit SHA of the build, or null where it could not be determined. */
  commit: readBuildEnv(process.env.BUILD_COMMIT),

  /**
   * When the build ran, ISO-8601.
   *
   * Doubles as the reference point the collector check needs: an absent
   * heartbeat means "not due yet" shortly after a deploy and "not firing at
   * all" long after one, and only a build time can tell those apart.
   */
  builtAt: readBuildEnv(process.env.BUILD_TIME),
} as const;
