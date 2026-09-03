import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * Flat ESLint configuration.
 *
 * `eslint-config-next` 16 ships native flat configs, so they are imported
 * directly. Routing them through `FlatCompat` — the pattern older Next
 * projects use — fails here, because the compat layer tries to JSON-serialise
 * a plugin object that contains a circular reference.
 */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      "node_modules/**",
      "out/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "seo/generated/**",
      "next-env.d.ts",
      "cloudflare-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Deferred-work markers are forbidden in the production path: an
      // unfinished branch should either be finished or not shipped.
      "no-warning-comments": [
        "error",
        { terms: ["to" + "do", "fix" + "me", "xxx"], location: "anywhere" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "prefer-const": "error",
    },
  },
  {
    // Build-time scripts and tests run in Node and legitimately write to stdout.
    // `.mjs` as well as `.ts`: the local-credential tooling under scripts/local
    // is plain ESM so it keeps working when the TypeScript toolchain does not.
    files: [
      "scripts/**/*.ts",
      "scripts/**/*.mjs",
      "tests/**/*.ts",
      "tests/**/*.tsx",
      "*.config.mts",
    ],
    rules: {
      "no-console": "off",
      "no-warning-comments": "off",
    },
  },
];

export default eslintConfig;
