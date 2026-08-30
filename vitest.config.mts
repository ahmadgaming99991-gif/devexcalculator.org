import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolves the `@/*` alias from tsconfig.json natively.
    tsconfigPaths: true,
    alias: [
      /*
       * `server-only` throws on import outside a React Server Component, which
       * is the point of it: `get-dictionary.ts` imports it so that a client
       * module importing the dictionary loader fails the build, naming the
       * chain. Vitest is neither a server nor a client build, so it resolves
       * the throwing entry point and three suites that legitimately exercise
       * the loader stopped loading at all.
       *
       * Aliased to an empty local stub rather than switching the resolver to
       * the `react-server` condition globally: that condition also selects
       * React's RSC build, which is not what the component tests render
       * against. Enforcement lives in `next build`, where the real client
       * boundary exists; the tests are not the guard and should not pretend
       * to be.
       */
      {
        find: /^server-only$/,
        replacement: fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
      },
    ],
  },
  test: {
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // `include` is declared per project below. Declaring it here as well would
    // make both projects match the same files and run every test twice.
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: [
            "tests/unit/**/*.test.ts",
            "tests/integration/**/*.test.ts",
          ],
          exclude: ["tests/unit/components/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: [
            "tests/unit/components/**/*.test.tsx",
            "tests/unit/components/**/*.test.ts",
          ],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      include: ["src/lib/**/*.ts", "src/features/**/*.ts"],
    },
  },
});
