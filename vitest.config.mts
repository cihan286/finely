// ─────────────────────────────────────────────────────────────────────────────
// Test runner (Vitest) settings
//
// In plain words: automated tests check that the parts of Finely that do
// calculations — reading bank statements, dates, dashboard figures — keep
// giving the right answers as the code changes, and that one company can
// never see or change another company's data. `npm test` runs them.
//
// For developers: tests live next to the code as *.test.ts. Calculations
// are tested as pure functions; the data functions (lib/data/) run against
// an in-memory Postgres (see lib/data/testing.ts). No React rendering.
// `@/…` imports resolve through tsconfig.json's paths.
// ─────────────────────────────────────────────────────────────────────────────

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // "server-only" only exists inside Next.js; tests get an empty stand-in
    alias: {
      "server-only": fileURLToPath(
        new URL("./src/test/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
