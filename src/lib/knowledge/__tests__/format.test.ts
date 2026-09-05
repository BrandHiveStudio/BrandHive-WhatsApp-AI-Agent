import { describe, it, expect } from "vitest";
import { formatPriceDisplay } from "@/lib/knowledge/format";

describe("formatPriceDisplay", () => {
  it("formats a fixed price plainly", () => {
    const result = formatPriceDisplay({
      pricing_type: "fixed",
      price: 5000,
      starting_price: null,
      currency: "LKR",
      unit: null,
    });
    expect(result).toBe("LKR 5,000");
  });

  it("appends the unit for a fixed price", () => {
    const result = formatPriceDisplay({
      pricing_type: "fixed",
      price: 500,
      starting_price: null,
      currency: "LKR",
      unit: "page",
    });
    expect(result).toBe("LKR 500 / page");
  });

  it("prefixes 'Starting from' for a starting_from price", () => {
    const result = formatPriceDisplay({
      pricing_type: "starting_from",
      price: null,
      starting_price: 15000,
      currency: "LKR",
      unit: null,
    });
    expect(result).toBe("Starting from LKR 15,000");
  });

  it("never blurs starting_from into a fixed-looking number", () => {
    const result = formatPriceDisplay({
      pricing_type: "starting_from",
      price: null,
      starting_price: 15000,
      currency: "LKR",
      unit: null,
    });
    expect(result.startsWith("Starting from")).toBe(true);
    expect(result).not.toBe("LKR 15,000");
  });

  it("always returns the fixed custom-quote phrase, ignoring any price fields", () => {
    const result = formatPriceDisplay({
      pricing_type: "custom_quote",
      price: 999,
      starting_price: 111,
      currency: "LKR",
      unit: null,
    });
    expect(result).toBe("Custom quotation required");
  });

  it("degrades safely instead of fabricating a number when fixed price is missing", () => {
    const result = formatPriceDisplay({
      pricing_type: "fixed",
      price: null,
      starting_price: null,
      currency: "LKR",
      unit: null,
    });
    expect(result).not.toMatch(/LKR/);
    expect(result.toLowerCase()).toContain("not available");
  });

  it("degrades safely instead of fabricating a number when starting_price is missing", () => {
    const result = formatPriceDisplay({
      pricing_type: "starting_from",
      price: null,
      starting_price: null,
      currency: "LKR",
      unit: null,
    });
    expect(result.toLowerCase()).toContain("not available");
  });

  it("appends the ad-budget suffix for a fixed price, matching the catalog's own wording", () => {
    const result = formatPriceDisplay({
      pricing_type: "fixed",
      price: 25000,
      starting_price: null,
      currency: "LKR",
      unit: null,
      ad_budget_separate: true,
    });
    expect(result).toBe("LKR 25,000 + Ad Budget");
  });

  it("appends the ad-budget suffix for a starting_from price, after the unit", () => {
    const result = formatPriceDisplay({
      pricing_type: "starting_from",
      price: null,
      starting_price: 40000,
      currency: "LKR",
      unit: "Month",
      ad_budget_separate: true,
    });
    expect(result).toBe("Starting from LKR 40,000 / Month + Ad Budget");
  });

  it("never adds an ad-budget suffix to a custom quotation", () => {
    const result = formatPriceDisplay({
      pricing_type: "custom_quote",
      price: null,
      starting_price: null,
      currency: "LKR",
      unit: null,
      ad_budget_separate: true,
    });
    expect(result).toBe("Custom quotation required");
  });

  it("omits the suffix entirely when ad_budget_separate is false or absent", () => {
    const withFlag = formatPriceDisplay({
      pricing_type: "fixed",
      price: 5000,
      starting_price: null,
      currency: "LKR",
      unit: null,
      ad_budget_separate: false,
    });
    const withoutFlag = formatPriceDisplay({
      pricing_type: "fixed",
      price: 5000,
      starting_price: null,
      currency: "LKR",
      unit: null,
    });
    expect(withFlag).toBe("LKR 5,000");
    expect(withoutFlag).toBe("LKR 5,000");
  });
});
