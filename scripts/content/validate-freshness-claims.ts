/**
 * Gate: no request-time freshness claim on `/platform/`, in any language.
 *
 * Runs as `npm run validate:freshness`, and inside `npm run check`. The rules
 * and the reasoning live in `freshness-claims.ts`, which the unit tests import
 * as well, so the gate and the tests cannot disagree about what is banned.
 */
import { LOCALES, scanFreshnessClaims } from "./freshness-claims";

const findings = scanFreshnessClaims();

console.log(`Freshness claims: /platform/ surface across ${LOCALES.length} locales`);

for (const finding of findings) {
  console.error(`  ERROR    ${finding.where}`);
  console.error(`           ${finding.why}  ${finding.pattern}`);
  console.error(`           "${finding.text}"`);
}

if (findings.length > 0) {
  console.error(
    `\n${findings.length} request-time claim(s). These figures are collected on a schedule and stored;` +
      " nothing is fetched because a reader opened the page.",
  );
  process.exit(1);
}

console.log("  0 request-time claims. Freshness validation passed.");
