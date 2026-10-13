import { describe, it, expect } from "vitest";
import {
  parseInlineTokens,
  parseMessageBlocks,
  isSafeUrl,
} from "@/components/chat-markdown";

describe("ChatMarkdown Parser & Security", () => {
  describe("URL Safety (isSafeUrl)", () => {
    it("allows standard https and http URLs", () => {
      expect(isSafeUrl("https://brandhive.io")).toBe(true);
      expect(isSafeUrl("http://localhost:3000")).toBe(true);
    });

    it("allows mailto and tel links", () => {
      expect(isSafeUrl("mailto:info@brandhive.io")).toBe(true);
      expect(isSafeUrl("tel:+94771234567")).toBe(true);
    });

    it("strictly rejects javascript: and dangerous execution schemes", () => {
      expect(isSafeUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
      expect(isSafeUrl("vbscript:msgbox(1)")).toBe(false);
      expect(isSafeUrl("")).toBe(false);
    });
  });

  describe("Inline WhatsApp & Markdown Formatting (parseInlineTokens)", () => {
    it("parses WhatsApp bold *text*", () => {
      const tokens = parseInlineTokens("Hello *BrandHive Studio*!");
      expect(tokens).toEqual([
        { type: "text", value: "Hello " },
        { type: "bold", value: "BrandHive Studio" },
        { type: "text", value: "!" },
      ]);
    });

    it("parses Markdown bold **text**", () => {
      const tokens = parseInlineTokens("Special **Web Design** offer");
      expect(tokens).toEqual([
        { type: "text", value: "Special " },
        { type: "bold", value: "Web Design" },
        { type: "text", value: " offer" },
      ]);
    });

    it("parses WhatsApp italic _text_", () => {
      const tokens = parseInlineTokens("This is _urgent_.");
      expect(tokens).toEqual([
        { type: "text", value: "This is " },
        { type: "italic", value: "urgent" },
        { type: "text", value: "." },
      ]);
    });

    it("parses WhatsApp strikethrough ~text~ and Markdown ~~text~~", () => {
      const tokens = parseInlineTokens("Old price ~LKR 50,000~ is now ~~LKR 40,000~~");
      expect(tokens).toEqual([
        { type: "text", value: "Old price " },
        { type: "strike", value: "LKR 50,000" },
        { type: "text", value: " is now " },
        { type: "strike", value: "LKR 40,000" },
      ]);
    });

    it("parses inline monospace `code`", () => {
      const tokens = parseInlineTokens("Use code `DISCOUNT20` at checkout");
      expect(tokens).toEqual([
        { type: "text", value: "Use code " },
        { type: "code", value: "DISCOUNT20" },
        { type: "text", value: " at checkout" },
      ]);
    });

    it("parses Markdown links [text](url) and raw URLs", () => {
      const tokens = parseInlineTokens(
        "Visit [Our Website](https://brandhive.io) or check https://brandhive.io/pricing"
      );
      expect(tokens).toEqual([
        { type: "text", value: "Visit " },
        { type: "link", label: "Our Website", href: "https://brandhive.io" },
        { type: "text", value: " or check " },
        { type: "url", href: "https://brandhive.io/pricing" },
      ]);
    });

    it("preserves ordinary text without false positive bold matching on math/asterisks", () => {
      const tokens = parseInlineTokens("Calculate 2 * 3 = 6 and 4 * 5 = 20");
      expect(tokens).toEqual([
        { type: "text", value: "Calculate 2 * 3 = 6 and 4 * 5 = 20" },
      ]);
    });

    it("handles Sinhala and Tamil text with emoji without breaking", () => {
      const tokens = parseInlineTokens("සුභ දවසක්! 🚀 *BrandHive* වෙත සාදරයෙන් පිළිගනිමු.");
      expect(tokens).toEqual([
        { type: "text", value: "සුභ දවසක්! 🚀 " },
        { type: "bold", value: "BrandHive" },
        { type: "text", value: " වෙත සාදරයෙන් පිළිගනිමු." },
      ]);
    });
  });

  describe("Block-level Parsing (parseMessageBlocks)", () => {
    it("parses unordered list items", () => {
      const content = "Services:\n- Logo Design\n- Web Development\n* SEO";
      const blocks = parseMessageBlocks(content);
      expect(blocks).toEqual([
        { type: "line", content: "Services:" },
        {
          type: "ul",
          items: ["Logo Design", "Web Development", "SEO"],
        },
      ]);
    });

    it("parses ordered list items", () => {
      const content = "Steps:\n1. Choose package\n2. Confirm order\n3. Start project";
      const blocks = parseMessageBlocks(content);
      expect(blocks).toEqual([
        { type: "line", content: "Steps:" },
        {
          type: "ol",
          items: ["Choose package", "Confirm order", "Start project"],
        },
      ]);
    });

    it("parses blockquotes", () => {
      const content = "> Note: All prices are subject to 50% advance.";
      const blocks = parseMessageBlocks(content);
      expect(blocks).toEqual([
        {
          type: "quote",
          content: "Note: All prices are subject to 50% advance.",
        },
      ]);
    });

    it("parses multiline code blocks", () => {
      const content = "Here is the snippet:\n```\nconst a = 10;\nconsole.log(a);\n```";
      const blocks = parseMessageBlocks(content);
      expect(blocks).toEqual([
        { type: "line", content: "Here is the snippet:" },
        { type: "codeblock", content: "const a = 10;\nconsole.log(a);" },
      ]);
    });
  });
});
