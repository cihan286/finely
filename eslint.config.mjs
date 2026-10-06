// ─────────────────────────────────────────────────────────────────────────────
// Code checker (ESLint) settings
//
// In plain words: ESLint reads our code and warns about common mistakes and
// bad practices, a bit like a spell checker for code. Run it with
// `npm run lint`. This file says which sets of rules to use.
// ─────────────────────────────────────────────────────────────────────────────

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // Next.js' recommended rules, including ones that protect page speed
  ...nextVitals,
  // Extra rules for TypeScript code
  ...nextTs,
  // Override default ignores of eslint-config-next.
  // Folders and files that are generated automatically, so not worth checking
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
