import { supabase } from "@/lib/supabase";
import type { Service, ServiceItemType } from "@/lib/types";
import { formatPriceDisplay } from "@/lib/knowledge/format";
import type {
  ServiceSummary,
  ServiceSearchResult,
  ServicePricingResult,
  ServicePricingDetail,
  AddonListResult,
  AddonDetail,
  FaqSearchResult,
  BusinessInfoResult,
} from "@/lib/knowledge/types";

// ---------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------

function toSummary(row: Service): ServiceSummary {
  return {
    slug: row.slug,
    name: row.name,
    category: row.category,
    description: row.description,
    item_type: row.item_type,
  };
}

function extractStringArray(value: unknown): string[] | null {
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return value as string[];
  }
  return null;
}

function toPricingDetail(row: Service): ServicePricingDetail {
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  return {
    slug: row.slug,
    name: row.name,
    category: row.category,
    description: row.description,
    item_type: row.item_type,
    pricing_type: row.pricing_type,
    price: row.price,
    starting_price: row.starting_price,
    currency: row.currency,
    unit: row.unit,
    ad_budget_separate: row.ad_budget_separate,
    inclusions: extractStringArray(metadata.inclusions),
    exclusions: extractStringArray(metadata.exclusions),
    display_price: formatPriceDisplay(row),
  };
}

/** Fetch every active service. Small catalog (SME service list), so
 * matching is done in application code rather than building dynamic
 * PostgREST filter strings -- simpler, safe against filter-syntax
 * injection from free-text queries, and easy to unit test. */
async function fetchActiveServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Service[];
}

// Strips hyphen/dash punctuation so "ecommerce" matches "E-Commerce Website"
// and "ui ux" matches "UI/UX Design" -- generic punctuation normalization,
// not a per-word synonym dictionary.
function normalizeForSearch(text: string): string {
  return text.toLowerCase().replace(/[-–—/]/g, "");
}

// A small, generic map from structural query words to item_type -- lets
// "packages" or "individual services" surface the right rows even when no
// service's name/category literally contains that word. Not a synonym
// dictionary for specific services; just the two structural categories the
// schema itself already distinguishes.
const ITEM_TYPE_KEYWORDS: Record<string, ServiceItemType> = {
  package: "package",
  packages: "package",
  bundle: "package",
  bundles: "package",
  service: "service",
  services: "service",
};

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whole-word containment, not raw substring containment -- otherwise short
// common words falsely match inside unrelated words (e.g. the term "you"
// would substring-match inside "your", turning almost any query into a hit).
function containsWholeWord(haystack: string, term: string): boolean {
  return new RegExp(`\\b${escapeRegExp(term)}\\b`).test(haystack);
}

function scoreMatch(query: string, haystacks: (string | null)[], itemType?: ServiceItemType): number {
  const terms = query
    .split(/\s+/)
    .map((t) => normalizeForSearch(t.trim()))
    .filter((t) => t.length >= 2);

  if (terms.length === 0) return 0;

  const text = normalizeForSearch(haystacks.filter(Boolean).join(" "));

  return terms.reduce((score, term) => {
    let next = score;
    if (containsWholeWord(text, term)) next += 1;
    if (itemType && ITEM_TYPE_KEYWORDS[term] === itemType) next += 1;
    return next;
  }, 0);
}

type ResolvedService =
  | { kind: "exact" | "fuzzy"; row: Service }
  | { kind: "ambiguous"; candidates: Service[] }
  | { kind: "none" };

function resolveService(query: string, services: Service[]): ResolvedService {
  const normalized = query.trim().toLowerCase();

  const exact = services.filter(
    (s) => s.slug.toLowerCase() === normalized || s.name.toLowerCase() === normalized
  );
  if (exact.length === 1) return { kind: "exact", row: exact[0] };
  if (exact.length > 1) return { kind: "ambiguous", candidates: exact };

  const scored = services
    .map((row) => ({ row, score: scoreMatch(query, [row.name, row.description, row.category]) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { kind: "none" };
  if (scored.length === 1 || scored[0].score > scored[1].score) {
    return { kind: "fuzzy", row: scored[0].row };
  }
  return { kind: "ambiguous", candidates: scored.slice(0, 5).map((s) => s.row) };
}

// ---------------------------------------------------------------------
// search_services
// ---------------------------------------------------------------------

export async function searchServices(query: string, limit = 5): Promise<ServiceSearchResult> {
  try {
    const services = await fetchActiveServices();
    const scored = services
      .map((row) => ({
        row,
        score: scoreMatch(query, [row.name, row.description, row.category], row.item_type),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, limit));

    if (scored.length === 0) {
      return { status: "no_match", query, matches: [] };
    }
    return { status: "results", query, matches: scored.map((s) => toSummary(s.row)) };
  } catch (err) {
    return {
      status: "error",
      query,
      matches: [],
      message: err instanceof Error ? err.message : "Knowledge lookup failed",
    };
  }
}

// ---------------------------------------------------------------------
// get_service_pricing
// ---------------------------------------------------------------------

export async function getServicePricing(service: string): Promise<ServicePricingResult> {
  try {
    const services = await fetchActiveServices();
    const resolved = resolveService(service, services);

    switch (resolved.kind) {
      case "none":
        return { status: "no_match", authoritative: true, query: service };
      case "ambiguous":
        return {
          status: "ambiguous",
          authoritative: true,
          query: service,
          candidates: resolved.candidates.map(toSummary),
        };
      case "exact":
      case "fuzzy":
        return {
          status: "match",
          authoritative: true,
          match_confidence: resolved.kind,
          service: toPricingDetail(resolved.row),
        };
    }
  } catch (err) {
    return {
      status: "error",
      authoritative: false,
      message: err instanceof Error ? err.message : "Knowledge lookup failed",
    };
  }
}

// ---------------------------------------------------------------------
// list_addons
// ---------------------------------------------------------------------

function toAddonDetail(row: {
  name: string;
  description: string | null;
  pricing_type: ServicePricingDetail["pricing_type"];
  price: number | null;
  starting_price: number | null;
  currency: string;
  unit: string | null;
}): AddonDetail {
  return {
    name: row.name,
    description: row.description,
    pricing_type: row.pricing_type,
    price: row.price,
    starting_price: row.starting_price,
    currency: row.currency,
    unit: row.unit,
    display_price: formatPriceDisplay(row),
  };
}

/**
 * Lists BrandHive add-ons. Pass a service name/slug to get add-ons attached
 * specifically to that service; omit it to get BrandHive's general/global
 * add-on catalog (add-ons not tied to any one service -- this is the actual
 * shape of the current BrandHive data: every imported add-on is global).
 */
export async function listAddons(service?: string): Promise<AddonListResult> {
  try {
    if (!service || !service.trim()) {
      const { data, error } = await supabase
        .from("service_addons")
        .select("*")
        .is("service_id", null)
        .eq("active", true);

      if (error) throw error;

      return { status: "results", scope: "global", service: null, addons: (data ?? []).map(toAddonDetail) };
    }

    const services = await fetchActiveServices();
    const resolved = resolveService(service, services);

    if (resolved.kind === "none") {
      return { status: "no_match", query: service };
    }
    if (resolved.kind === "ambiguous") {
      return { status: "ambiguous", query: service, candidates: resolved.candidates.map(toSummary) };
    }

    const { data, error } = await supabase
      .from("service_addons")
      .select("*")
      .eq("service_id", resolved.row.id)
      .eq("active", true);

    if (error) throw error;

    return {
      status: "results",
      scope: "service",
      service: toSummary(resolved.row),
      addons: (data ?? []).map(toAddonDetail),
    };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Knowledge lookup failed" };
  }
}

// ---------------------------------------------------------------------
// search_faqs
// ---------------------------------------------------------------------

export async function searchFaqs(query: string, limit = 5): Promise<FaqSearchResult> {
  try {
    const { data, error } = await supabase
      .from("faqs")
      .select("*")
      .eq("active", true)
      .order("display_order", { ascending: true });

    if (error) throw error;

    const scored = (data ?? [])
      .map((row) => ({ row, score: scoreMatch(query, [row.question, row.answer, row.category]) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, limit));

    if (scored.length === 0) {
      return { status: "no_match", query, matches: [] };
    }
    return {
      status: "results",
      query,
      matches: scored.map((s) => ({
        question: s.row.question,
        answer: s.row.answer,
        category: s.row.category,
      })),
    };
  } catch (err) {
    return {
      status: "error",
      query,
      matches: [],
      message: err instanceof Error ? err.message : "Knowledge lookup failed",
    };
  }
}

// ---------------------------------------------------------------------
// get_business_info
// ---------------------------------------------------------------------

export async function getBusinessInfo(key?: string): Promise<BusinessInfoResult> {
  try {
    let query = supabase.from("settings").select("*").eq("active", true);
    if (key) query = query.eq("key", key);
    const { data, error } = await query.order("key", { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return key ? { status: "no_match", key } : { status: "results", entries: [] };
    }

    return {
      status: "results",
      entries: data.map((row) => ({ key: row.key, value: row.value, description: row.description })),
    };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Knowledge lookup failed" };
  }
}
