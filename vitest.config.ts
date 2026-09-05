import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // Setting `exclude` replaces Vitest's own defaults rather than merging
    // with them, so the standard set is repeated here plus our own addition:
    // live BrandHive AI validation tests (real OpenRouter + Supabase calls)
    // run only via `npm run test:live` with vitest.live.config.ts -- never
    // as part of the default unit-test run.
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{vite,vitest}.config.*.timestamp-*",
      "src/lib/__live-tests__/**",
    ],
  },
});
