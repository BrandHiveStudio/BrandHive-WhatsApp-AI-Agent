import { vi, describe, it, expect, beforeEach } from "vitest";

const createCompletion = vi.fn();
const constructorSpy = vi.fn();


vi.mock("openai", () => ({
  default: class MockOpenAI {
    constructor(opts: unknown) {
      constructorSpy(opts);
    }
    chat = { completions: { create: createCompletion } };
  },
}));

vi.mock("@/lib/env", () => ({
  getRequiredEnv: (name: string) => `test-${name}-value`,
}));

const executeToolCall = vi.fn();
vi.mock("@/lib/ai-tools", () => ({
  KNOWLEDGE_TOOLS: [],
  executeToolCall,
}));

const { getAIResponse } = await import("@/lib/ai");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function messagesOf(callIndex: number): any[] {
  return createCompletion.mock.calls[callIndex][0].messages;
}

beforeEach(() => {
  createCompletion.mockReset();
  executeToolCall.mockReset();
  constructorSpy.mockClear();
});

describe("getAIResponse orchestration", () => {
  it("initializes OpenAI client targeting Google Gemini's OpenAI-compatible endpoint", async () => {
    createCompletion.mockResolvedValueOnce({
      choices: [{ message: { role: "assistant", content: "Hello! How can I help?" } }],
    });
    await getAIResponse([{ role: "user", content: "Hi" }]);
    expect(constructorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        apiKey: "test-GEMINI_API_KEY-value",
      })
    );
  });

  it("resolves gemini-2.5-flash to Google's active gemini-3.6-flash model", async () => {
    createCompletion.mockResolvedValueOnce({
      choices: [{ message: { role: "assistant", content: "Hello!" } }],
    });
    await getAIResponse([{ role: "user", content: "Hi" }]);
    expect(createCompletion.mock.calls[0][0].model).toBe("gemini-3.6-flash");
  });

  it("returns the model's direct reply when no tool call is requested", async () => {
    createCompletion.mockResolvedValueOnce({
      choices: [{ message: { role: "assistant", content: "Hello! How can I help?" } }],
    });
    const reply = await getAIResponse([{ role: "user", content: "Hi" }]);
    expect(reply).toBe("Hello! How can I help?");
    expect(createCompletion).toHaveBeenCalledTimes(1);
  });


  it("sends the real BrandHive Agent Script as the system message, not the removed dental prompt", async () => {
    createCompletion.mockResolvedValueOnce({ choices: [{ message: { content: "ok" } }] });
    await getAIResponse([{ role: "user", content: "Hi" }]);

    const systemMessage = messagesOf(0)[0];
    expect(systemMessage.role).toBe("system");
    expect(systemMessage.content).toContain("BrandHive Studio");
    expect(systemMessage.content).toMatch(/never invent a brandhive service/i);
    expect(systemMessage.content.toLowerCase()).not.toContain("dentist");
    expect(systemMessage.content.toLowerCase()).not.toContain("toothsi");
  });

  it("executes a requested tool call and feeds the authoritative result back to the model", async () => {
    executeToolCall.mockResolvedValueOnce({
      status: "match",
      authoritative: true,
      match_confidence: "exact",
      service: { name: "Logo Design", display_price: "LKR 8,000" },
    });
    createCompletion
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_1",
                  type: "function",
                  function: { name: "get_service_pricing", arguments: JSON.stringify({ service: "logo" }) },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: "Logo Design starts from LKR 8,000." } }],
      });

    const reply = await getAIResponse([{ role: "user", content: "logo price?" }]);

    expect(executeToolCall).toHaveBeenCalledWith("get_service_pricing", JSON.stringify({ service: "logo" }));
    expect(reply).toBe("Logo Design starts from LKR 8,000.");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolMessage = messagesOf(1).find((m: any) => m.role === "tool");
    expect(toolMessage.content).toContain("LKR 8,000");
    expect(toolMessage.tool_call_id).toBe("call_1");
  });

  it("passes a tool error through to the model rather than silently discarding or fabricating a result", async () => {
    executeToolCall.mockResolvedValueOnce({ status: "error", authoritative: false, message: "connection refused" });
    createCompletion
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                { id: "call_1", type: "function", function: { name: "get_service_pricing", arguments: "{}" } },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: "I'm having trouble confirming that right now." } }],
      });

    await getAIResponse([{ role: "user", content: "price?" }]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolMessage = messagesOf(1).find((m: any) => m.role === "tool");
    expect(toolMessage.content).toContain("error");
    expect(toolMessage.content).not.toMatch(/LKR\s?[\d,]+/); // no fabricated number introduced by the loop itself
  });

  it("returns the fallback message instead of looping forever if the model keeps requesting tools", async () => {
    executeToolCall.mockResolvedValue({ status: "no_match" });
    createCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [{ id: "call_x", type: "function", function: { name: "search_services", arguments: "{}" } }],
          },
        },
      ],
    });

    const reply = await getAIResponse([{ role: "user", content: "??" }]);

    expect(reply).toBe("Sorry, I couldn't generate a response.");
    // MAX_TOOL_ITERATIONS = 5 in lib/ai.ts
    expect(createCompletion).toHaveBeenCalledTimes(5);
  });

});

describe("multilingual message passthrough", () => {
  // These confirm the orchestration never mangles, transliterates, or
  // otherwise alters a customer's message before it reaches the model, for
  // every language/script/style the specification requires support for.
  // Whether the *model* then understands and replies correctly in that
  // language is a live-model behavior question this unit test cannot and
  // does not claim to verify -- that requires a real OpenRouter call.
  const examples: [string, string][] = [
    ["English", "What is your logo design price?"],
    ["Singlish", "Logo ekak kiyada?"],
    ["Sinhala", "ලෝගෝ එකක් හදන්න කීයක්ද?"],
    ["Tanglish", "Logo design panna evlo?"],
    ["Tamil", "லோகோ செய்ய எவ்வளவு?"],
    ["Mixed Sinhala/English", "mata website ekak one. Price eka kiyanna."],
  ];

  it.each(examples)("passes a %s message through to the model exactly as received", async (_label, text) => {
    createCompletion.mockResolvedValueOnce({ choices: [{ message: { content: "ok" } }] });
    await getAIResponse([{ role: "user", content: text }]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userMessage = messagesOf(0).find((m: any) => m.role === "user");
    expect(userMessage.content).toBe(text);
  });
});
