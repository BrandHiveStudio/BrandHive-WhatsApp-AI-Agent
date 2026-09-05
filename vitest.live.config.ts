import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "node:path";

// Separate config for the opt-in live BrandHive AI validation suite (see
// src/lib/__live-tests__). Deliberately NOT included in the default
// `npm test` run (vitest.config.ts) -- these tests make real, potentially
// billed OpenRouter API calls and real (read-only) Supabase queries, so
// they must never run silently as part of the normal unit-test suite or
// CI regression check. Invoke explicitly with `npm run test:live`, and
// only with real credentials present in the environment (never committed).
export default defineConfig(({ mode }) => {
  // Unlike `next dev`/`next build`/`next start`, a plain `vitest` process
  // does not automatically load `.env.local` -- so without this, the live
  // harness's own credential check always sees the required variables as
  // absent even when the file has real values. This loads the project
  // root's .env* files (per Vite's standard convention: .env, .env.local,
  // .env.[mode], .env.[mode].local) into this config process only, then
  // merges them into process.env so the test file's own `process.env.X`
  // reads pick them up. Config-only: no application runtime code changes,
  // and this never affects the default `npm test` run (vitest.config.ts
  // is untouched). Never logs or otherwise exposes the loaded values.
  const env = loadEnv(mode, process.cwd(), "");
  process.env = { ...process.env, ...env };

  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      environment: "node",
      include: ["src/lib/__live-tests__/**/*.test.ts"],
      // 30s was too tight for openrouter/free: 3 of 36 scenarios in the
      // 2026-09-05 run exceeded it while the underlying request kept running
      // in the background, and Vitest doesn't cancel an in-flight test on
      // timeout -- so the late response printed under the NEXT scenario's
      // console output instead, mislabeling it. Real observed durations for
      // calls that did complete ranged up to ~28s, so 60s gives realistic
      // free-tier headroom without masking a truly hung request forever.
      // This does not eliminate the possibility of an even slower response
      // still outliving the budget (true cancellation would need an
      // AbortSignal threaded through lib/ai.ts, which is production code
      // and out of scope here) -- it reduces the failure mode's frequency
      // rather than guaranteeing it away.
      testTimeout: 60000,
    },
  };
});
