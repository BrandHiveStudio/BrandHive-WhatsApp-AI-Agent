import { describe, it, expect, vi, beforeAll } from "vitest";
import { getAIResponse } from "@/lib/ai";
import { getAIBehaviorConfig, buildBehaviorPromptSection, DEFAULT_AI_BEHAVIOR } from "@/lib/ai-behavior";
import { buildSystemPrompt } from "@/lib/system-prompt";
import * as aiTools from "@/lib/ai-tools";
import type { AIBehaviorConfig } from "@/lib/types";

const HAS_CREDENTIALS = Boolean(
  process.env.GEMINI_API_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

describe.runIf(HAS_CREDENTIALS)("PHASE 3H-22: Gemini 2.5 Flash Backend Verification Suite", () => {
  const toolCallsLog: Array<{ tool: string; args: string; result?: string }> = [];
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  beforeAll(() => {
    // Intercept tool calls to verify complete request/response/tool-call flow
    const originalExecute = aiTools.executeToolCall;
    vi.spyOn(aiTools, "executeToolCall").mockImplementation(async (name: string, rawArgs: string) => {
      const res = await originalExecute(name, rawArgs);
      toolCallsLog.push({ tool: name, args: rawArgs, result: res });
      return res;
    });
  });

  // =========================================================================
  // STEP 5: ADMIN AI BEHAVIOR VERIFICATION
  // =========================================================================
  describe("STEP 5: Admin AI Behavior Configuration & Prompt Injection", () => {
    it("programmatically loads ai_behavior and verifies all required behavioral directives", async () => {
      const config: AIBehaviorConfig = await getAIBehaviorConfig();

      expect(config).toBeDefined();
      expect(config.tone).toBeTruthy();
      expect(config.friendliness).toBeDefined();
      expect(config.professionalism).toBeDefined();
      expect(config.sales_approach).toContain("UNDERSTAND -> RECOMMEND -> SELL");
      expect(config.question_frequency).toBe("one_at_a_time");
      expect(config.language_mirroring).toBe(true);
      expect(config.whatsapp_formatting).toBe(true);

      const prompt = buildSystemPrompt(config);

      // Verify each required directive is present in the final prompt
      expect(prompt).toContain("Friendly");
      expect(prompt).toContain("professional");
      expect(prompt).toContain("Creative with communication, strictly accurate with business facts");
      expect(prompt).toContain("Normally 1–4 short sentences; mobile-friendly, never write essays");
      expect(prompt).toContain("WhatsApp Formatting: Keep messages concise and mobile-readable");
      expect(prompt).toContain("Ask only ONE question at a time to avoid overwhelming the customer");
      expect(prompt).toContain("English");
      expect(prompt).toContain("Sinhala script");
      expect(prompt).toContain("Tamil script");
      expect(prompt).toContain("Singlish");
      expect(prompt).toContain("Tanglish");
      expect(prompt).toContain("natural code-switching");
      expect(prompt).toContain("UNDERSTAND -> RECOMMEND -> SELL");
    });
  });

  // =========================================================================
  // STEP 4: TOOL-CALLING FLOW & KNOWLEDGE GUARDRAILS
  // =========================================================================
  describe("STEP 4: Tool-Calling Loop & Knowledge Layer Flow", () => {
    it("completes full Customer -> Gemini -> Tool Call -> executeToolCall -> Knowledge -> Gemini -> Response round-trip", async () => {
      await delay(3000);
      toolCallsLog.length = 0;

      const input = [
        { role: "user" as const, content: "What is your pricing for Social Media Management?" },
      ];
      const reply = await getAIResponse(input);

      console.log("\n[Step 4 Tool-Calling Flow]");
      console.log("Customer Message:", input[0].content);
      console.log("Tool Calls Recorded:", toolCallsLog.map((t) => `${t.tool}(${t.args})`));
      console.log("Final AI Response:", reply);

      expect(reply).toBeTruthy();
      expect(reply).not.toBe("Sorry, I couldn't generate a response.");

      // Tool must be invoked
      const calledPricingOrSearch = toolCallsLog.some(
        (t) => t.tool === "get_service_pricing" || t.tool === "search_services"
      );
      expect(calledPricingOrSearch).toBe(true);

      // Must obtain authoritative price from DB (LKR 25,000)
      expect(reply).toMatch(/(LKR|Rs\.?)\s?25,?000/i);
      // Concise WhatsApp response
      expect(reply.length).toBeLessThan(500);
      // No secrets leaked
      expect(reply).not.toContain(process.env.GEMINI_API_KEY);
    }, 60000);
  });

  // =========================================================================
  // STEP 3: BACKEND GEMINI API TEST (7 SIMULATED CUSTOMER MESSAGES)
  // =========================================================================
  describe("STEP 3: 7 Simulated Customer Scenarios", () => {
    it("1. English logo inquiry: 'Hi, I need a logo for my business.'", async () => {
      await delay(4000);
      toolCallsLog.length = 0;

      const input = [{ role: "user" as const, content: "Hi, I need a logo for my business." }];
      const reply = await getAIResponse(input);

      console.log("\n[Scenario 1: English Logo Inquiry]");
      console.log("Customer:", input[0].content);
      console.log("Gemini Response:", reply);
      console.log("Tools Invoked:", toolCallsLog.map((t) => t.tool).join(", ") || "None");

      expect(reply).toBeTruthy();
      expect(reply).not.toBe("Sorry, I couldn't generate a response.");
      expect(reply.length).toBeGreaterThan(15);
      expect(reply.length).toBeLessThan(500);
      expect(reply).not.toContain(process.env.GEMINI_API_KEY);
    }, 60000);

    it("2. Singlish logo inquiry: 'mata logo ekak hadaganna one, price eka kohomada?'", async () => {
      await delay(4000);
      toolCallsLog.length = 0;

      const input = [
        { role: "user" as const, content: "mata logo ekak hadaganna one, price eka kohomada?" },
      ];
      const reply = await getAIResponse(input);

      console.log("\n[Scenario 2: Singlish Logo Inquiry]");
      console.log("Customer:", input[0].content);
      console.log("Gemini Response:", reply);
      console.log("Tools Invoked:", toolCallsLog.map((t) => t.tool).join(", ") || "None");

      expect(reply).toBeTruthy();
      expect(reply).not.toBe("Sorry, I couldn't generate a response.");
      // Knowledge tool for pricing must be invoked
      expect(toolCallsLog.some((t) => t.tool === "get_service_pricing" || t.tool === "search_services")).toBe(true);
      // Price must reflect knowledge base (LKR 8,000)
      expect(reply).toMatch(/(LKR|Rs\.?)\s?8,?000/i);
      expect(reply.length).toBeLessThan(600);
      expect(reply).not.toContain(process.env.GEMINI_API_KEY);
    }, 60000);

    it("3. Tanglish logo inquiry: 'enakku business logo venum, price evlo?'", async () => {
      await delay(4000);
      toolCallsLog.length = 0;

      const input = [
        { role: "user" as const, content: "enakku business logo venum, price evlo?" },
      ];
      const reply = await getAIResponse(input);

      console.log("\n[Scenario 3: Tanglish Logo Inquiry]");
      console.log("Customer:", input[0].content);
      console.log("Gemini Response:", reply);
      console.log("Tools Invoked:", toolCallsLog.map((t) => t.tool).join(", ") || "None");

      expect(reply).toBeTruthy();
      expect(reply).not.toBe("Sorry, I couldn't generate a response.");
      expect(toolCallsLog.some((t) => t.tool === "get_service_pricing" || t.tool === "search_services")).toBe(true);
      expect(reply).toMatch(/(LKR|Rs\.?)\s?8,?000/i);
      expect(reply.length).toBeLessThan(600);
      expect(reply).not.toContain(process.env.GEMINI_API_KEY);
    }, 60000);

    it("4. Short greeting: 'hi'", async () => {
      await delay(4000);
      toolCallsLog.length = 0;

      const input = [{ role: "user" as const, content: "hi" }];
      const reply = await getAIResponse(input);

      console.log("\n[Scenario 4: Short Greeting]");
      console.log("Customer:", input[0].content);
      console.log("Gemini Response:", reply);

      expect(reply).toBeTruthy();
      expect(reply).not.toBe("Sorry, I couldn't generate a response.");
      // Greeting should be short and warm (< 250 chars)
      expect(reply.length).toBeGreaterThan(10);
      expect(reply.length).toBeLessThan(300);
      expect(reply).not.toContain(process.env.GEMINI_API_KEY);
    }, 60000);

    it("5. Realistic service/price question: Web development / e-commerce pricing", async () => {
      await delay(4000);
      toolCallsLog.length = 0;

      const input = [
        { role: "user" as const, content: "How much does a web development or online store package cost?" },
      ];
      const reply = await getAIResponse(input);

      console.log("\n[Scenario 5: Service/Pricing Inquiry]");
      console.log("Customer:", input[0].content);
      console.log("Gemini Response:", reply);
      console.log("Tools Invoked:", toolCallsLog.map((t) => `${t.tool}(${t.args})`).join(", ") || "None");

      expect(reply).toBeTruthy();
      expect(reply).not.toBe("Sorry, I couldn't generate a response.");
      // Must query services or pricing
      expect(toolCallsLog.length).toBeGreaterThan(0);
      // DB starting price for Web Development is LKR 45,000
      expect(reply).toMatch(/(LKR|Rs\.?)\s?45,?000/i);
      expect(reply.length).toBeLessThan(600);
      expect(reply).not.toContain(process.env.GEMINI_API_KEY);
    }, 60000);

    it("6. Context-dependent follow-up message", async () => {
      await delay(4000);
      toolCallsLog.length = 0;

      const conversationHistory = [
        { role: "user" as const, content: "Do you offer branding packages?" },
        {
          role: "assistant" as const,
          content:
            "Yes, we do! We offer Logo Design starting from LKR 8,000 and full Brand Identity starting from LKR 35,000. Which one would fit your current stage?",
        },
        {
          role: "user" as const,
          content: "I have a very tight startup budget. Between those two, which one would you recommend starting with?",
        },
      ];

      const reply = await getAIResponse(conversationHistory);

      console.log("\n[Scenario 6: Contextual Follow-up]");
      console.log("Conversation History Length:", conversationHistory.length);
      console.log("Customer Follow-up:", conversationHistory[2].content);
      console.log("Gemini Response:", reply);

      expect(reply).toBeTruthy();
      expect(reply).not.toBe("Sorry, I couldn't generate a response.");
      // Must refer to Logo Design or the budget option (8,000)
      expect(reply.toLowerCase()).toMatch(/logo|8,?000/i);
      // Consultative and concise
      expect(reply.length).toBeLessThan(500);
      expect(reply).not.toContain(process.env.GEMINI_API_KEY);
    }, 60000);

    it("7. Mixed Singlish/Tanglish code-switching message", async () => {
      await delay(4000);
      toolCallsLog.length = 0;

      const input = [
        {
          role: "user" as const,
          content: "Machan enakku quick logo ekak venum, what is the starting price and options?",
        },
      ];
      const reply = await getAIResponse(input);

      console.log("\n[Scenario 7: Mixed Singlish/Tanglish]");
      console.log("Customer:", input[0].content);
      console.log("Gemini Response:", reply);
      console.log("Tools Invoked:", toolCallsLog.map((t) => t.tool).join(", ") || "None");

      expect(reply).toBeTruthy();
      expect(reply).not.toBe("Sorry, I couldn't generate a response.");
      // Tool should be called for logo pricing
      expect(toolCallsLog.some((t) => t.tool === "get_service_pricing" || t.tool === "search_services")).toBe(true);
      // Price must be accurate (LKR 8,000)
      expect(reply).toMatch(/(LKR|Rs\.?)\s?8,?000/i);
      expect(reply.length).toBeLessThan(600);
      expect(reply).not.toContain(process.env.GEMINI_API_KEY);
    }, 60000);
  });
});
