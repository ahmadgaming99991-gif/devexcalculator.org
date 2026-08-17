import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

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
      "next-env.d.ts",
      "cloudflare-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // The master specification forbids TODO/FIXME markers in the production
      // path. This turns that rule into an enforced lint error.
      "no-warning-comments": [
        "error",
        { terms: ["todo", "fixme", "xxx", "hack:"], location: "anywhere" },
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
    // Build-time scripts run in Node and legitimately write to stdout.
    files: ["scripts/**/*.ts", "tests/**/*.ts", "tests/**/*.tsx"],
    rules: {
      "no-console": "off",
      "no-warning-comments": "off",
    },
  },
];

export default eslintConfig;
