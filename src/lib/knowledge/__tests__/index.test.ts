import { vi, describe, it, expect, beforeEach } from "vitest";
import { makeSupabaseMock } from "./supabase-mock";
import type { Service, ServiceAddon, Faq, Setting } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentMock: any;

vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return currentMock;
  },
}));

const { searchServices, getServicePricing, listAddons, searchFaqs, getBusinessInfo } = await import(
  "@/lib/knowledge"
);

function service(overrides: Partial<Service>): Service {
  return {
    id: overrides.id ?? "svc-1",
    name: "Logo Design",
    slug: "logo-design",
    description: "A custom logo for your brand",
    category: "branding",
    pricing_type: "fixed",
    price: 5000,
    starting_price: null,
    currency: "LKR",
    unit: null,
    item_type: "service",
    ad_budget_separate: false,
    active: true,
    display_order: 0,
    metadata: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const LOGO = service({ id: "svc-logo", name: "Logo Design", slug: "logo-design", category: "branding" });
const WEBSITE = service({
  id: "svc-web",
  name: "Website Design",
  slug: "website-design",
  category: "web",
  pricing_type: "starting_from",
  price: null,
  starting_price: 25000,
});
const BRANDING = service({
  id: "svc-brand",
  name: "Full Branding Package",
  slug: "full-branding",
  category: "branding",
  pricing_type: "custom_quote",
  price: null,
  starting_price: null,
});

beforeEach(() => {
  currentMock = makeSupabaseMock({});
});

describe("searchServices", () => {
  it("returns results for a matching query", async () => {
    currentMock = makeSupabaseMock({ services: { data: [LOGO, WEBSITE, BRANDING], error: null } });
    const result = await searchServices("logo");
    expect(result.status).toBe("results");
    expect(result.matches.map((m) => m.slug)).toContain("logo-design");
  });

  it("returns no_match when nothing scores", async () => {
    currentMock = makeSupabaseMock({ services: { data: [LOGO, WEBSITE, BRANDING], error: null } });
    const result = await searchServices("submarine repair");
    expect(result.status).toBe("no_match");
    expect(result.matches).toHaveLength(0);
  });

  it("returns a controlled error result on database failure, never inventing data", async () => {
    currentMock = makeSupabaseMock({ services: { data: null, error: { message: "connection refused" } } });
    const result = await searchServices("logo");
    expect(result.status).toBe("error");
    expect(result.matches).toHaveLength(0);
  });
});

describe("getServicePricing", () => {
  it("returns a fixed-price match with the correct display string", async () => {
    currentMock = makeSupabaseMock({ services: { data: [LOGO, WEBSITE, BRANDING], error: null } });
    const result = await getServicePricing("logo-design");
    expect(result.status).toBe("match");
    if (result.status === "match") {
      expect(result.service.pricing_type).toBe("fixed");
      expect(result.service.display_price).toBe("LKR 5,000");
      expect(result.match_confidence).toBe("exact");
    }
  });

  it("returns a starting_from match distinctly, never as a fixed number", async () => {
    currentMock = makeSupabaseMock({ services: { data: [LOGO, WEBSITE, BRANDING], error: null } });
    const result = await getServicePricing("website design");
    expect(result.status).toBe("match");
    if (result.status === "match") {
      expect(result.service.pricing_type).toBe("starting_from");
      expect(result.service.display_price.startsWith("Starting from")).toBe(true);
    }
  });

  it("returns a custom_quote match with no numeric price leaked", async () => {
    currentMock = makeSupabaseMock({ services: { data: [LOGO, WEBSITE, BRANDING], error: null } });
    const result = await getServicePricing("full-branding");
    expect(result.status).toBe("match");
    if (result.status === "match") {
      expect(result.service.pricing_type).toBe("custom_quote");
      expect(result.service.display_price).toBe("Custom quotation required");
    }
  });

  it("returns no_match rather than guessing when nothing fits", async () => {
    currentMock = makeSupabaseMock({ services: { data: [LOGO, WEBSITE, BRANDING], error: null } });
    const result = await getServicePricing("submarine repair");
    expect(result.status).toBe("no_match");
  });

  it("returns ambiguous with candidates rather than picking one at random", async () => {
    const brandingAddon = service({ id: "svc-brand-2", name: "Branding Refresh", slug: "branding-refresh", category: "branding" });
    currentMock = makeSupabaseMock({ services: { data: [LOGO, WEBSITE, BRANDING, brandingAddon], error: null } });
    const result = await getServicePricing("branding");
    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") {
      expect(result.candidates.length).toBeGreaterThan(1);
    }
  });

  it("returns a controlled error result on database failure", async () => {
    currentMock = makeSupabaseMock({ services: { data: null, error: { message: "timeout" } } });
    const result = await getServicePricing("logo-design");
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.authoritative).toBe(false);
    }
  });
});

describe("listAddons", () => {
  it("returns addons for a resolved service", async () => {
    const addon: ServiceAddon = {
      id: "addon-1",
      service_id: "svc-logo",
      name: "Extra concept",
      description: "One additional logo concept",
      pricing_type: "fixed",
      price: 1500,
      starting_price: null,
      currency: "LKR",
      unit: null,
      active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    currentMock = makeSupabaseMock({
      services: { data: [LOGO, WEBSITE, BRANDING], error: null },
      service_addons: { data: [addon], error: null },
    });
    const result = await listAddons("logo-design");
    expect(result.status).toBe("results");
    if (result.status === "results") {
      expect(result.addons).toHaveLength(1);
      expect(result.addons[0].display_price).toBe("LKR 1,500");
    }
  });

  it("returns no_match when the service can't be resolved", async () => {
    currentMock = makeSupabaseMock({ services: { data: [LOGO, WEBSITE, BRANDING], error: null } });
    const result = await listAddons("submarine repair");
    expect(result.status).toBe("no_match");
  });
});

describe("searchFaqs", () => {
  const faqs: Faq[] = [
    {
      id: "faq-1",
      question: "How long does a logo take?",
      answer: "Typically 3-5 business days.",
      category: "branding",
      active: true,
      display_order: 0,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ];

  it("returns matching FAQs", async () => {
    currentMock = makeSupabaseMock({ faqs: { data: faqs, error: null } });
    const result = await searchFaqs("logo turnaround time");
    expect(result.status).toBe("results");
    expect(result.matches[0].question).toContain("logo");
  });

  it("returns no_match when nothing scores", async () => {
    currentMock = makeSupabaseMock({ faqs: { data: faqs, error: null } });
    const result = await searchFaqs("refund policy for spaceships");
    expect(result.status).toBe("no_match");
  });
});

describe("getBusinessInfo", () => {
  const settings: Setting[] = [
    { key: "hours", value: "Mon-Fri 9am-6pm", description: null, active: true, created_at: "", updated_at: "" },
  ];

  it("returns all active entries when no key is given", async () => {
    currentMock = makeSupabaseMock({ settings: { data: settings, error: null } });
    const result = await getBusinessInfo();
    expect(result.status).toBe("results");
    if (result.status === "results") {
      expect(result.entries).toHaveLength(1);
    }
  });

  it("returns no_match for an unknown key", async () => {
    currentMock = makeSupabaseMock({ settings: { data: [], error: null } });
    const result = await getBusinessInfo("nonexistent_key");
    expect(result.status).toBe("no_match");
  });

  it("returns a controlled error result on database failure", async () => {
    currentMock = makeSupabaseMock({ settings: { data: null, error: { message: "down" } } });
    const result = await getBusinessInfo();
    expect(result.status).toBe("error");
  });
});

describe("package vs individual service classification", () => {
  const STARTER_PACKAGE = service({
    id: "svc-pkg-1",
    name: "Starter Brand Identity",
    slug: "starter-brand-identity",
    category: "branding",
    item_type: "package",
    pricing_type: "starting_from",
    price: null,
    starting_price: 15000,
  });
  const INDIVIDUAL_LOGO = service({
    id: "svc-logo-2",
    name: "Logo Design",
    slug: "logo-design-2",
    category: "branding",
    item_type: "service",
  });

  it("preserves item_type through search results", async () => {
    currentMock = makeSupabaseMock({ services: { data: [STARTER_PACKAGE, INDIVIDUAL_LOGO], error: null } });
    const result = await searchServices("brand");
    expect(result.status).toBe("results");
    const pkg = result.matches.find((m) => m.slug === "starter-brand-identity");
    const svc = result.matches.find((m) => m.slug === "logo-design-2");
    expect(pkg?.item_type).toBe("package");
    expect(svc?.item_type).toBe("service");
  });

  it("preserves item_type through a pricing lookup", async () => {
    currentMock = makeSupabaseMock({ services: { data: [STARTER_PACKAGE, INDIVIDUAL_LOGO], error: null } });
    const result = await getServicePricing("starter-brand-identity");
    expect(result.status).toBe("match");
    if (result.status === "match") {
      expect(result.service.item_type).toBe("package");
    }
  });
});

describe("ad_budget_separate pricing", () => {
  const GROWTH_WITH_BOOSTING = service({
    id: "svc-smm-growth-boost",
    name: "Social Media Growth — With Boosting",
    slug: "smm-growth-boosting",
    category: "social-media",
    item_type: "package",
    pricing_type: "fixed",
    price: 25000,
    unit: "Month",
    ad_budget_separate: true,
  });

  it("never states the ad budget as part of the base price", async () => {
    currentMock = makeSupabaseMock({ services: { data: [GROWTH_WITH_BOOSTING], error: null } });
    const result = await getServicePricing("smm-growth-boosting");
    expect(result.status).toBe("match");
    if (result.status === "match") {
      // Matches the Master Specification's own catalog wording exactly.
      expect(result.service.display_price).toBe("LKR 25,000 / Month + Ad Budget");
      // The structured flag is exposed distinctly, not just baked into text.
      expect(result.service.ad_budget_separate).toBe(true);
    }
  });

  it("never invents a numeric ad-budget amount anywhere in the result", async () => {
    currentMock = makeSupabaseMock({ services: { data: [GROWTH_WITH_BOOSTING], error: null } });
    const result = await getServicePricing("smm-growth-boosting");
    expect(result.status).toBe("match");
    if (result.status === "match") {
      // The only price-like fields present are the BrandHive service fee.
      expect(result.service.price).toBe(25000);
      expect(result.service.starting_price).toBeNull();
      // No separate ad-budget amount field exists anywhere on the result
      // (i.e. this is a boolean flag, never a fabricated number).
      expect(Object.keys(result.service)).not.toContain("ad_budget_amount");
    }
  });

  it("does not add the ad-budget suffix when the flag is false", async () => {
    const plainFixed = service({ pricing_type: "fixed", price: 5000, ad_budget_separate: false });
    currentMock = makeSupabaseMock({ services: { data: [plainFixed], error: null } });
    const result = await getServicePricing("logo-design");
    expect(result.status).toBe("match");
    if (result.status === "match") {
      expect(result.service.display_price).toBe("LKR 5,000");
      expect(result.service.display_price).not.toContain("Ad Budget");
    }
  });
});
