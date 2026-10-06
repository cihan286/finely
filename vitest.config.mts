// ─────────────────────────────────────────────────────────────────────────────
// Test runner (Vitest) settings
//
// In plain words: automated tests check that the parts of Finely that do
// calculations — reading bank statements, dates, dashboard figures — keep
// giving the right answers as the code changes. `npm test` runs them.
//
// For developers: tests live next to the code as *.test.ts and cover pure
// functions only (no database, no React rendering). `@/…` imports resolve
// through tsconfig.json's paths.
// ─────────────────────────────────────────────────────────────────────────────

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
