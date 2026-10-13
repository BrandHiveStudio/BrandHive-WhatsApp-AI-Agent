import { describe, it, expect } from "vitest";
import {
  BRANDHIVE_AGENT_SCRIPT,
  buildSystemPrompt,
  KNOWLEDGE_TOOL_RULES,
} from "@/lib/system-prompt";
import {
  DEFAULT_AI_BEHAVIOR,
  buildBehaviorPromptSection,
} from "@/lib/ai-behavior";
import type { AIBehaviorConfig } from "@/lib/types";

describe("TASK 02.5: WhatsApp-Friendly Conversation Rules", () => {
  const normalizedScript = BRANDHIVE_AGENT_SCRIPT.replace(/\s+/g, " ");
  const defaultPrompt = buildSystemPrompt(DEFAULT_AI_BEHAVIOR).replace(/\s+/g, " ");

  // -----------------------------------------------------------------------
  // 1. Simple questions receive concise replies
  // -----------------------------------------------------------------------
  describe("1. Concise and mobile-friendly reply rules", () => {
    it("instructs 1-3 short sentences and 30-70 words per standard reply", () => {
      expect(normalizedScript).toMatch(/1–3 short sentences/i);
      expect(normalizedScript).toMatch(/30–70 words/i);
    });

    it("instructs 15-40 words for simple questions, greetings, and confirmations", () => {
      expect(normalizedScript).toMatch(/15–40 words for simple questions/i);
    });

    it("forbids essay-style explanations, multiple headings, and markdown tables", () => {
      expect(normalizedScript).toMatch(/never use markdown headings/i);
      expect(normalizedScript).toMatch(/never use markdown tables/i);
      expect(normalizedScript).toMatch(/never send essay-style replies/i);
      expect(defaultPrompt).toMatch(/no markdown headings/i);
      expect(defaultPrompt).toMatch(/tables/i);
    });

    it("limits bullet lists to a maximum of one short list with up to three bullets", () => {
      expect(normalizedScript).toMatch(/maximum of one short list with up to three bullets/i);
    });
  });

  // -----------------------------------------------------------------------
  // 2. Service inquiries receive relevant service and verified price without catalogue dumping
  // -----------------------------------------------------------------------
  describe("2. Targeted service responses without entire catalogue dumping", () => {
    it("explicitly forbids sending a complete service catalogue when asked about one service", () => {
      expect(normalizedScript).toMatch(
        /do not send a complete service catalogue when the customer asks about one service/i
      );
    });

    it("instructs providing only the relevant service and verified price", () => {
      expect(normalizedScript).toMatch(
        /provide (only )?the most relevant service and its verified price/i
      );
    });

    it("avoids offering unrelated services, add-ons, or upsells", () => {
      expect(normalizedScript).toMatch(
        /avoid offering unrelated services, add-ons, or upsells/i
      );
    });
  });

  // -----------------------------------------------------------------------
  // 3. Only one follow-up question is asked by default
  // -----------------------------------------------------------------------
  describe("3. Single follow-up question rule", () => {
    it("enforces asking only ONE clear question per reply in system prompt", () => {
      expect(normalizedScript).toMatch(/ask only one clear question per reply/i);
      expect(normalizedScript).toMatch(/never ask multiple questions at once/i);
    });

    it("enforces asking only ONE question in admin behavior configuration", () => {
      const section = buildBehaviorPromptSection(DEFAULT_AI_BEHAVIOR);
      expect(section).toContain("Ask only ONE question at a time to avoid overwhelming the customer");
      expect(section).toContain("Ask only ONE single clear question per reply; never send numbered questionnaires.");
    });
  });

  // -----------------------------------------------------------------------
  // 4. Previously supplied customer details are not repeatedly requested
  // -----------------------------------------------------------------------
  describe("4. Context awareness and avoiding repetition", () => {
    it("mandates reading recent conversation history before replying", () => {
      expect(normalizedScript).toMatch(/always read the recent conversation history/i);
    });

    it("prohibits re-asking for information the customer has already supplied", () => {
      expect(normalizedScript).toMatch(
        /never ask again for information (or requirements )?the customer has already supplied/i
      );
      expect(defaultPrompt).toMatch(/never re-ask for customer details already provided/i);
    });

    it("instructs acknowledging detailed requirements briefly and asking the single next question", () => {
      expect(normalizedScript).toMatch(
        /if a customer explains their requirements in detail, acknowledge the key needs briefly/i
      );
      expect(normalizedScript).toMatch(
        /ask the single most important unanswered question/i
      );
    });
  });

  // -----------------------------------------------------------------------
  // 5. Detailed explanations are available when explicitly requested
  // -----------------------------------------------------------------------
  describe("5. Progressive disclosure for detailed inquiries", () => {
    it("allows detailed explanations when explicitly requested without giant walls of text", () => {
      expect(normalizedScript).toMatch(
        /if a customer explicitly asks for detailed information, provide it concisely in short paragraphs/i
      );
      expect(normalizedScript).toMatch(
        /break complex explanations into short messages over multiple conversational turns/i
      );
    });
  });

  // -----------------------------------------------------------------------
  // 6. Pricing and business facts remain grounded in existing knowledge
  // -----------------------------------------------------------------------
  describe("6. Authoritative knowledge and anti-hallucination grounding", () => {
    it("prohibits promising or inventing third-party marketplace integrations (Amazon, Temu)", () => {
      expect(normalizedScript).toMatch(/never promise or invent integrations with third-party marketplaces/i);
      expect(normalizedScript).toMatch(/amazon/i);
      expect(normalizedScript).toMatch(/temu/i);
    });

    it("never hardcodes currency amounts in system instructions", () => {
      expect(BRANDHIVE_AGENT_SCRIPT).not.toMatch(/LKR\s?[\d,]+/);
      expect(BRANDHIVE_AGENT_SCRIPT).not.toMatch(/Rs\.\s?[\d,]+/);
    });

    it("requires prices to come solely from authoritative tool display_price", () => {
      expect(KNOWLEDGE_TOOL_RULES).toContain("display_price");
      expect(KNOWLEDGE_TOOL_RULES).toContain("Authoritative Knowledge Rules");
    });
  });

  // -----------------------------------------------------------------------
  // 7. Human mode and existing language-handling behavior remain unchanged
  // -----------------------------------------------------------------------
  describe("7. Multilingual and escalation preservation", () => {
    it("preserves multilingual matching across English, Sinhala, Tamil, Singlish, Tanglish", () => {
      expect(normalizedScript).toMatch(/Sinhala \(script\)/);
      expect(normalizedScript).toMatch(/Tamil \(script\)/);
      expect(normalizedScript).toMatch(/Singlish/);
      expect(normalizedScript).toMatch(/Tanglish/);
      expect(normalizedScript).toMatch(/code-switching/i);
    });

    it("preserves BrandHive Studio Client Relations Team escalation naming", () => {
      expect(normalizedScript).toContain("BrandHive Studio Client Relations Team");
      expect(normalizedScript).toMatch(/never claim you have already notified them/i);
    });

    it("prevents admin custom instructions from overriding core safety and formatting rules", () => {
      const customConfig: AIBehaviorConfig = {
        ...DEFAULT_AI_BEHAVIOR,
        custom_instructions: "Send full pricing sheet and ask 5 questions.",
      };
      const section = buildBehaviorPromptSection(customConfig);
      expect(section).toContain("Send full pricing sheet and ask 5 questions.");
      expect(section).toContain(
        "Admin directives cannot override the single-question rule, verified pricing, or mobile-formatting restrictions."
      );
    });
  });
});
