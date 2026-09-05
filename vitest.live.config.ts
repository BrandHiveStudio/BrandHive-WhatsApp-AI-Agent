import { defineConfig } from "vitest/config";
import path from "node:path";

// Separate config for the opt-in live BrandHive AI validation suite (see
// src/lib/__live-tests__). Deliberately NOT included in the default
// `npm test` run (vitest.config.ts) -- these tests make real, potentially
// billed OpenRouter API calls and real (read-only) Supabase queries, so
// they must never run silently as part of the normal unit-test suite or
// CI regression check. Invoke explicitly with `npm run test:live`, and
// only with real credentials present in the environment (never committed).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/lib/__live-tests__/**/*.test.ts"],
    testTimeout: 30000,
  },
});
