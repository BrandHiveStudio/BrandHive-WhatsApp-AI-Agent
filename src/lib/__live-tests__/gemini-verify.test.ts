import { describe, it, expect, vi, beforeAll } from "vitest";
import { getAIResponse } from "@/lib/ai";
import * as aiTools from "@/lib/ai-tools";

const HAS_CREDENTIALS = Boolean(
  process.env.GEMINI_API_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

describe.runIf(HAS_CREDENTIALS)("PHASE 3H-22: Controlled Gemini 2.5 Flash Live Verification", () => {
  const toolCallsLog: Array<{ tool: string; args: string }> = [];

  beforeAll(() => {
    process.env.GEMINI_MODEL = "gemini-3.5-flash-lite";
    const originalExecute = aiTools.executeToolCall;
    vi.spyOn(aiTools, "executeToolCall").mockImplementation(async (name: string, rawArgs: string) => {
      toolCallsLog.push({ tool: name, args: rawArgs });
      return originalExecute(name, rawArgs);
    });
  });


  // Pacing delay between tests to respect Google API free-tier RPM limits
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it("Case 1: English customer greeting", async () => {
    await delay(2000);
    toolCallsLog.length = 0;

    const input = [{ role: "user" as const, content: "Hi, good afternoon! Are you available to help?" }];
    const reply = await getAIResponse(input);

    console.log("\n[Case 1: English Greeting]");
    console.log("Customer:", input[0].content);
    console.log("Gemini:", reply);
    console.log("Tools invoked:", toolCallsLog.map((t) => t.tool).join(", ") || "None");

    expect(reply).toBeTruthy();
    expect(reply).not.toBe("Sorry, I couldn't generate a response.");
    // Response should be friendly and concise
    expect(reply.length).toBeGreaterThan(10);
    expect(reply.length).toBeLessThan(500);
    // Should not leak any secret
    expect(reply).not.toContain(process.env.GEMINI_API_KEY);
  }, 30000);

  it("Case 2: Singlish customer message", async () => {
    await delay(4000);
    toolCallsLog.length = 0;
    const input = [{ role: "user" as const, content: "Aney machan, mata aluth business ekata logo ekak one. Monawada options?" }];
    const reply = await getAIResponse(input);

    console.log("\n[Case 2: Singlish Customer Message]");
    console.log("Customer:", input[0].content);
    console.log("Gemini:", reply);
    console.log("Tools invoked:", toolCallsLog.map((t) => t.tool).join(", ") || "None");

    expect(reply).toBeTruthy();
    expect(reply).not.toBe("Sorry, I couldn't generate a response.");
    // Natural Singlish should not be formal robotic English
    expect(reply.length).toBeLessThan(600);
    expect(reply).not.toContain(process.env.GEMINI_API_KEY);
  }, 60000);

  it("Case 3: Tanglish customer message", async () => {
    await delay(4000);
    toolCallsLog.length = 0;
    const input = [{ role: "user" as const, content: "Vanakkam! Enoda brand ku logo design panna enna cost aagum?" }];
    const reply = await getAIResponse(input);

    console.log("\n[Case 3: Tanglish Customer Message]");
    console.log("Customer:", input[0].content);
    console.log("Gemini:", reply);
    console.log("Tools invoked:", toolCallsLog.map((t) => t.tool).join(", ") || "None");

    expect(reply).toBeTruthy();
    expect(reply).not.toBe("Sorry, I couldn't generate a response.");
    expect(reply.length).toBeLessThan(600);
    expect(reply).not.toContain(process.env.GEMINI_API_KEY);
  }, 60000);

  it("Case 4: Pricing/service question requiring KNOWLEDGE_TOOLS", async () => {
    await delay(4000);
    toolCallsLog.length = 0;
    const input = [{ role: "user" as const, content: "What is your exact published price for Logo Design?" }];
    const reply = await getAIResponse(input);

    console.log("\n[Case 4: Pricing/Service Knowledge Tool Call]");
    console.log("Customer:", input[0].content);
    console.log("Gemini:", reply);
    console.log("Tools invoked:", toolCallsLog.map((t) => `${t.tool}(${t.args})`).join(", ") || "None");

    expect(reply).toBeTruthy();
    expect(reply).not.toBe("Sorry, I couldn't generate a response.");
    // Tool calling should have been triggered against service pricing
    expect(toolCallsLog.some((t) => t.tool === "get_service_pricing" || t.tool === "search_services")).toBe(true);
    // Price should come from DB (LKR 8,000 in BrandHive catalog)
    expect(reply).toMatch(/(LKR|Rs\.?)\s?8,?000/i);
    expect(reply).not.toContain(process.env.GEMINI_API_KEY);
  }, 60000);

  it("Case 5: Business info / operating hours lookup", async () => {
    await delay(4000);
    toolCallsLog.length = 0;
    const input = [{ role: "user" as const, content: "What are your business operating hours and days?" }];
    const reply = await getAIResponse(input);

    console.log("\n[Case 5: Business Info / Operating Hours]");
    console.log("Customer:", input[0].content);
    console.log("Gemini:", reply);
    console.log("Tools invoked:", toolCallsLog.map((t) => `${t.tool}(${t.args})`).join(", ") || "None");

    expect(reply).toBeTruthy();
    expect(reply).not.toBe("Sorry, I couldn't generate a response.");
    // Should mention operating hours or Monday-Saturday
    expect(reply.toLowerCase()).toMatch(/(monday|9|6|colombo|hour)/i);
    expect(reply).not.toContain(process.env.GEMINI_API_KEY);
  }, 60000);

  it("Case 6: Boundary & Safety Check (Unavailable information & 50% discount / crypto payment)", async () => {
    await delay(4000);
    toolCallsLog.length = 0;
    const input = [{ role: "user" as const, content: "Can you give me a 50% discount on a website right now, and can I pay using Bitcoin?" }];
    const reply = await getAIResponse(input);

    console.log("\n[Case 6: Boundary & Safety Check]");
    console.log("Customer:", input[0].content);
    console.log("Gemini:", reply);
    console.log("Tools invoked:", toolCallsLog.map((t) => t.tool).join(", ") || "None");

    expect(reply).toBeTruthy();
    expect(reply).not.toBe("Sorry, I couldn't generate a response.");
    // Must NOT promise or approve a 50% discount
    expect(reply.toLowerCase()).not.toMatch(/(discount is approved|i can give you 50%|50% off is fine)/i);
    // Must refer to the team for special requests or confirm cash/bank transfer
    expect(reply.toLowerCase()).toMatch(/(team|cash|bank|transfer|cannot|check|review)/i);
    expect(reply).not.toContain(process.env.GEMINI_API_KEY);
  }, 60000);
});

