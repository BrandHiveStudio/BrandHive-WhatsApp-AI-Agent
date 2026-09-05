import { vi } from "vitest";

type QueryResult = { data: unknown; error: { message: string } | null };

/** Minimal chainable stand-in for a supabase-js query builder. Every
 * chain method returns the same object; awaiting it resolves with the
 * fixed result this table was configured with. Not a real query engine
 * -- just enough surface for the knowledge layer's call patterns. */
function makeBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const chain = ["select", "eq", "is", "order", "limit", "maybeSingle", "single"];
  for (const method of chain) {
    builder[method] = vi.fn(() => builder);
  }
  (builder as { then: PromiseLike<QueryResult>["then"] }).then = (resolve, reject) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

export function makeSupabaseMock(tableResults: Record<string, QueryResult>) {
  return {
    from: vi.fn((table: string) => makeBuilder(tableResults[table] ?? { data: [], error: null })),
  };
}
