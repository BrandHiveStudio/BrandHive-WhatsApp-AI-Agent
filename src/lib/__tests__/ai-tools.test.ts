import { vi, describe, it, expect } from "vitest";

const searchServices = vi.fn(async () => ({ status: "results", query: "logo", matches: [] }));
const getServicePricing = vi.fn(async () => ({ status: "no_match", authoritative: true, query: "x" }));
const listAddons = vi.fn(async () => ({ status: "no_match", query: "x" }));
const searchFaqs = vi.fn(async () => ({ status: "no_match", query: "x", matches: [] }));
const getBusinessInfo = vi.fn(async () => ({ status: "results", entries: [] }));

vi.mock("@/lib/knowledge", () => ({
  searchServices,
  getServicePricing,
  listAddons,
  searchFaqs,
  getBusinessInfo,
}));

const { executeToolCall } = await import("@/lib/ai-tools");

describe("executeToolCall", () => {
  it("dispatches search_services with parsed args", async () => {
    await executeToolCall("search_services", JSON.stringify({ query: "logo", limit: 3 }));
    expect(searchServices).toHaveBeenCalledWith("logo", 3);
  });

  it("dispatches get_service_pricing with the service argument", async () => {
    await executeToolCall("get_service_pricing", JSON.stringify({ service: "logo-design" }));
    expect(getServicePricing).toHaveBeenCalledWith("logo-design");
  });

  it("dispatches get_business_info with no key when omitted", async () => {
    await executeToolCall("get_business_info", JSON.stringify({}));
    expect(getBusinessInfo).toHaveBeenCalledWith(undefined);
  });

  it("returns a controlled error for an unknown tool name rather than throwing", async () => {
    const result = (await executeToolCall("delete_everything", "{}")) as { status: string; message: string };
    expect(result.status).toBe("error");
    expect(result.message).toContain("Unknown tool");
  });

  it("returns a controlled error for malformed JSON arguments rather than throwing", async () => {
    const result = (await executeToolCall("search_services", "{not valid json")) as {
      status: string;
      message: string;
    };
    expect(result.status).toBe("error");
  });
});
