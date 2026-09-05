import type { ChatCompletionTool } from "openai/resources/chat/completions";
import {
  searchServices,
  getServicePricing,
  listAddons,
  searchFaqs,
  getBusinessInfo,
} from "@/lib/knowledge";

// Tool schemas use the OpenAI-compatible function-calling shape, since
// that's the mechanism the existing AI integration already uses (the
// `openai` SDK against OpenRouter's OpenAI-compatible endpoint) -- not a
// new provider-specific mechanism. Keeping this file as the only place
// that knows about "tools" keeps lib/knowledge/* provider-agnostic.
export const KNOWLEDGE_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_services",
      description:
        "Search BrandHive's authoritative service catalog with a natural-language query (service name, category, or a customer's own wording). Use this whenever a customer asks what services BrandHive offers or describes something they want done.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Natural-language search text, e.g. 'logo design' or 'website'." },
          limit: { type: "integer", description: "Max results to return (default 5).", minimum: 1, maximum: 10 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_service_pricing",
      description:
        "Get authoritative pricing for one specific BrandHive service. Always call this before stating any price -- never state a price from memory. Returns a clear fixed / starting_from / custom_quote distinction, or an explicit no-match/ambiguous result if the service can't be confidently identified.",
      parameters: {
        type: "object",
        properties: {
          service: { type: "string", description: "The service name or slug the customer is asking about." },
        },
        required: ["service"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_addons",
      description:
        "List authoritative BrandHive add-ons with their pricing. Pass `service` to get add-ons for one specific service; omit it to get BrandHive's general/global add-on catalog (use this for questions like 'what add-ons do you have?' or 'any extra options?' that aren't about one specific service).",
      parameters: {
        type: "object",
        properties: {
          service: {
            type: "string",
            description: "Optional: a service name or slug to list add-ons for. Omit for the general add-on catalog.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_faqs",
      description: "Search BrandHive's authoritative FAQ knowledge base for an answer to a customer's question.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The customer's question, in natural language." },
          limit: { type: "integer", description: "Max results to return (default 5).", minimum: 1, maximum: 10 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_business_info",
      description:
        "Get authoritative BrandHive business information (e.g. hours, contact details, address) from the business settings. Omit `key` to fetch all published business info.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "A specific settings key to look up. Omit to fetch everything." },
        },
      },
    },
  },
];

/**
 * Executes one model-requested tool call and returns a JSON-serializable
 * result. Never throws -- a lookup failure becomes a structured
 * {status:"error"} result so the calling loop can always feed something
 * back to the model rather than crashing the whole response.
 */
export async function executeToolCall(name: string, rawArgs: string): Promise<unknown> {
  let args: Record<string, unknown>;
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return { status: "error", message: "Invalid tool arguments" };
  }

  switch (name) {
    case "search_services":
      return searchServices(String(args.query ?? ""), typeof args.limit === "number" ? args.limit : undefined);
    case "get_service_pricing":
      return getServicePricing(String(args.service ?? ""));
    case "list_addons":
      return listAddons(typeof args.service === "string" && args.service.trim() ? args.service : undefined);
    case "search_faqs":
      return searchFaqs(String(args.query ?? ""), typeof args.limit === "number" ? args.limit : undefined);
    case "get_business_info":
      return getBusinessInfo(typeof args.key === "string" ? args.key : undefined);
    default:
      return { status: "error", message: `Unknown tool: ${name}` };
  }
}
