import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolves the `@/*` alias from tsconfig.json natively.
    tsconfigPaths: true,
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
