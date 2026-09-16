import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_AI_BEHAVIOR,
  buildBehaviorPromptSection,
  getAIBehaviorConfig,
  saveAIBehaviorConfig,
} from "@/lib/ai-behavior";
import { buildSystemPrompt } from "@/lib/system-prompt";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentMock: any;

vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return currentMock;
  },
}));

beforeEach(() => {
  currentMock = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };
});

describe("AI Behavior Configuration & Prompts", () => {
  it("provides BrandHive defaults conforming to Master Spec and Phase 3H-20 requirements", () => {
    expect(DEFAULT_AI_BEHAVIOR.tone).toContain("Friendly");
    expect(DEFAULT_AI_BEHAVIOR.friendliness).toBe("high");
    expect(DEFAULT_AI_BEHAVIOR.professionalism).toBe("high");
    expect(DEFAULT_AI_BEHAVIOR.creativity).toBe("moderate");
    expect(DEFAULT_AI_BEHAVIOR.response_length).toBe("short");
    expect(DEFAULT_AI_BEHAVIOR.language_mirroring).toBe(true);
    expect(DEFAULT_AI_BEHAVIOR.whatsapp_formatting).toBe(true);
    expect(DEFAULT_AI_BEHAVIOR.question_frequency).toBe("one_at_a_time");
  });

  it("builds the behavioral prompt section correctly from configuration", () => {
    const promptSection = buildBehaviorPromptSection({
      ...DEFAULT_AI_BEHAVIOR,
      tone: "Ultra warm and consultative",
      custom_instructions: "Emphasize our Colombo headquarters.",
    });

    expect(promptSection).toContain("Conversational behavior (Admin Configured)");
    expect(promptSection).toContain("Ultra warm and consultative");
    expect(promptSection).toContain("ONE question at a time");
    expect(promptSection).toContain("Multilingual & Style Mirroring");
    expect(promptSection).toContain("Emphasize our Colombo headquarters.");
  });

  it("buildSystemPrompt integrates behavioral rules with golden rules and knowledge rules", () => {
    const fullPrompt = buildSystemPrompt({
      tone: "Warm and direct",
    });

    // Identity & Agent Script
    expect(fullPrompt).toContain("BrandHive Studio");
    expect(fullPrompt).toContain("UNDERSTAND -> ASSIST -> RECOMMEND -> QUALIFY -> CONVERT");

    // Golden rules protecting business facts
    expect(fullPrompt).toMatch(/never invent a brandhive service/i);
    expect(fullPrompt).toMatch(/starting from/i);
    expect(fullPrompt).toMatch(/never confirm a payment as received/i);

    // Dynamic Admin Behavior Section
    expect(fullPrompt).toContain("Warm and direct");

    // Knowledge tool rules
    expect(fullPrompt).toContain("Authoritative Knowledge Rules");
    expect(fullPrompt).toContain("display_price");
  });

  it("getAIBehaviorConfig falls back safely to default behavior if DB returns nothing or fails", async () => {
    currentMock.from().maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const config = await getAIBehaviorConfig();
    expect(config.tone).toBe(DEFAULT_AI_BEHAVIOR.tone);
    expect(config.response_length).toBe("short");

    // Network error simulation
    currentMock.from().maybeSingle.mockRejectedValueOnce(new Error("DB Down"));
    const fallbackConfig = await getAIBehaviorConfig();
    expect(fallbackConfig.creativity).toBe("moderate");
  });

  it("getAIBehaviorConfig merges stored custom settings with default baseline", async () => {
    currentMock.from().maybeSingle.mockResolvedValueOnce({
      data: {
        value: {
          tone: "Playful and modern",
          emoji_usage: "moderate",
        },
      },
      error: null,
    });

    const config = await getAIBehaviorConfig();
    expect(config.tone).toBe("Playful and modern");
    expect(config.emoji_usage).toBe("moderate");
    expect(config.language_mirroring).toBe(true); // default retained
    expect(config.question_frequency).toBe("one_at_a_time"); // default retained
  });

  it("saveAIBehaviorConfig saves merged settings to the settings table", async () => {
    currentMock.from().maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const upsertSpy = vi.fn().mockResolvedValueOnce({ data: null, error: null });
    currentMock.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: upsertSpy,
    });

    const saved = await saveAIBehaviorConfig({ tone: "Executive & Polished" });
    expect(saved.tone).toBe("Executive & Polished");
    expect(upsertSpy).toHaveBeenCalled();
  });
});
