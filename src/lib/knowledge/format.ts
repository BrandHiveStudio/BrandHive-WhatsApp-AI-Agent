import type { PricingType } from "@/lib/types";

interface PriceLike {
  pricing_type: PricingType;
  price: number | null;
  starting_price: number | null;
  currency: string;
  unit: string | null;
  /** Optional: absent for rows (e.g. service_addons) that don't carry this
   * flag -- treated the same as false. */
  ad_budget_separate?: boolean;
}

function formatAmount(amount: number, currency: string): string {
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

/**
 * The single, centralized place that turns a raw pricing row into
 * customer-facing text. This exists so "fixed" vs "starting_from" vs
 * "custom_quote" can never be blurred together by the model rephrasing
 * a number in its own words -- the AI is expected to quote this string
 * verbatim rather than reconstruct pricing language itself.
 */
export function formatPriceDisplay(row: PriceLike): string {
  const unitSuffix = row.unit ? ` / ${row.unit}` : "";
  // Matches the Master Specification's own catalog format verbatim (e.g.
  // "LKR 25,000 + Ad Budget") -- never rendered for custom_quote, since a
  // custom quotation already has no numeric base to add it to.
  const adBudgetSuffix = row.ad_budget_separate ? " + Ad Budget" : "";

  switch (row.pricing_type) {
    case "fixed":
      if (row.price == null) {
        return "Pricing not available -- please confirm with the BrandHive team.";
      }
      return `${formatAmount(row.price, row.currency)}${unitSuffix}${adBudgetSuffix}`;

    case "starting_from":
      if (row.starting_price == null) {
        return "Pricing not available -- please confirm with the BrandHive team.";
      }
      return `Starting from ${formatAmount(row.starting_price, row.currency)}${unitSuffix}${adBudgetSuffix}`;

    case "custom_quote":
      return "Custom quotation required";

    default:
      return "Pricing not available -- please confirm with the BrandHive team.";
  }
}
