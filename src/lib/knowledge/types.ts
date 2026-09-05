import type { PricingType, ServiceItemType } from "@/lib/types";

// Every result the knowledge layer returns is explicit about whether it
// represents authoritative BrandHive data, so the AI orchestration layer
// (and the model, via the tool result) never has to guess whether a gap
// is "no data" vs "lookup failed" vs "too ambiguous to answer safely".

export interface ServiceSummary {
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  item_type: ServiceItemType;
}

export interface ServiceSearchResult {
  status: "results" | "no_match" | "error";
  query: string;
  matches: ServiceSummary[];
  message?: string;
}

export interface ServicePricingDetail {
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  item_type: ServiceItemType;
  pricing_type: PricingType;
  price: number | null;
  starting_price: number | null;
  currency: string;
  unit: string | null;
  /** True when a separate, customer-controlled advertising budget applies
   * on top of the price above. The amount is intentionally never present
   * here -- BrandHive does not fix or invent it; see display_price for the
   * safe customer-facing phrasing (e.g. "LKR 25,000 + Ad Budget"). */
  ad_budget_separate: boolean;
  inclusions: string[] | null;
  exclusions: string[] | null;
  /** Pre-formatted, safe-to-quote display string, e.g. "Rs. 5,000" /
   * "Starting from Rs. 5,000" / "Custom quotation required". Always
   * derive customer-facing pricing text from this, never re-derive it
   * from the raw pricing_type/price/starting_price fields. */
  display_price: string;
}

export type ServicePricingResult =
  | { status: "match"; authoritative: true; match_confidence: "exact" | "fuzzy"; service: ServicePricingDetail }
  | { status: "no_match"; authoritative: true; query: string }
  | { status: "ambiguous"; authoritative: true; query: string; candidates: ServiceSummary[] }
  | { status: "error"; authoritative: false; message: string };

export interface AddonDetail {
  name: string;
  description: string | null;
  pricing_type: PricingType;
  price: number | null;
  starting_price: number | null;
  currency: string;
  unit: string | null;
  display_price: string;
}

export type AddonListResult =
  | { status: "results"; service: ServiceSummary; addons: AddonDetail[] }
  | { status: "no_match"; query: string }
  | { status: "ambiguous"; query: string; candidates: ServiceSummary[] }
  | { status: "error"; message: string };

export interface FaqSummary {
  question: string;
  answer: string;
  category: string | null;
}

export interface FaqSearchResult {
  status: "results" | "no_match" | "error";
  query: string;
  matches: FaqSummary[];
  message?: string;
}

export interface BusinessInfoEntry {
  key: string;
  value: unknown;
  description: string | null;
}

export type BusinessInfoResult =
  | { status: "results"; entries: BusinessInfoEntry[] }
  | { status: "no_match"; key: string }
  | { status: "error"; message: string };

// Tool-call argument shapes (the JSON the model sends per tool).
export interface SearchServicesArgs {
  query: string;
  limit?: number;
}

export interface GetServicePricingArgs {
  service: string;
}

export interface ListAddonsArgs {
  service: string;
}

export interface SearchFaqsArgs {
  query: string;
  limit?: number;
}

export interface GetBusinessInfoArgs {
  key?: string;
}
