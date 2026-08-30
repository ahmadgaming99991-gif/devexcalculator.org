/**
 * An empty stand-in for the `server-only` package, used only by Vitest.
 *
 * `server-only` resolves to a module that throws unless the `react-server`
 * export condition is active. `get-dictionary.ts` imports it so that a client
 * module importing the dictionary loader fails `next build`, naming the chain.
 *
 * Vitest is neither a server nor a client build, so it resolves the throwing
 * entry point, and three suites that legitimately exercise the loader stopped
 * loading at all. This is aliased in `vitest.config.mts` rather than switching
 * the resolver to the `react-server` condition globally: that condition also
 * selects React's RSC build, which is not what the component tests render
 * against.
 *
 * The guard lives in `next build`, where the real client boundary exists. The
 * tests are not the guard and should not pretend to be — see D-045.
 */
export {};
