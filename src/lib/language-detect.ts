// Deterministic, code-only script detection for a single inbound WhatsApp
// message -- no AI call involved, so it never affects tool budget/latency.
// Distinguishes native Sinhala/Tamil *script* from Latin-script text.
// English, Singlish, and Tanglish all read the same at the script level
// (Latin characters), so they're all tagged "en" here -- this function
// cannot and does not attempt to tell those three apart; the AI itself
// already handles that distinction per-message via the Agent Script's own
// multilingual instructions. This is only a coarse signal for
// conversations.language (e.g. so staff can filter "Sinhala/Tamil script
// conversations" in a future dashboard), not a replacement for that.
export type DetectedLanguage = "si" | "ta" | "en";

// Unicode block ranges: Sinhala U+0D80-U+0DFF, Tamil U+0B80-U+0BFF.
const SINHALA_RANGE = /[඀-෿]/;
const TAMIL_RANGE = /[஀-௿]/;

export function detectMessageLanguage(text: string): DetectedLanguage | null {
  if (!text || !text.trim()) return null;
  if (SINHALA_RANGE.test(text)) return "si";
  if (TAMIL_RANGE.test(text)) return "ta";
  return "en";
}
