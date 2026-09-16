import { supabase } from "@/lib/supabase";
import type { AIBehaviorConfig } from "@/lib/types";

export const DEFAULT_AI_BEHAVIOR: AIBehaviorConfig = {
  tone: "Friendly, professional, and approachable",
  friendliness: "high",
  professionalism: "high",
  creativity: "moderate",
  response_length: "short",
  emoji_usage: "minimal",
  greeting_style: "Warm, concise, and helpful",
  sales_approach: "Helpful before being sales-oriented; UNDERSTAND -> RECOMMEND -> SELL",
  question_frequency: "one_at_a_time",
  language_mirroring: true,
  whatsapp_formatting: true,
  human_escalation_behavior:
    "Recognize situations needing human review honestly and state that BrandHive Studio Client Relations Team is needed; never claim someone has already been notified or is reviewing unless confirmed.",
  custom_instructions: "",
};

/**
 * Loads the active AI conversation behavior configuration from the authoritative
 * `settings` table (key: 'ai_behavior'). If unconfigured, absent, or unreachable,
 * safely falls back to BrandHive's default conversational behavior.
 */
export async function getAIBehaviorConfig(): Promise<AIBehaviorConfig> {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "ai_behavior")
      .eq("active", true)
      .maybeSingle();

    if (error || !data || !data.value || typeof data.value !== "object") {
      return { ...DEFAULT_AI_BEHAVIOR };
    }

    return {
      ...DEFAULT_AI_BEHAVIOR,
      ...(data.value as Partial<AIBehaviorConfig>),
    };
  } catch {
    return { ...DEFAULT_AI_BEHAVIOR };
  }
}

/**
 * Saves/updates the AI conversation behavior in the `settings` table.
 * Restricted to authenticated staff/admin actions.
 */
export async function saveAIBehaviorConfig(
  updates: Partial<AIBehaviorConfig>
): Promise<AIBehaviorConfig> {
  const current = await getAIBehaviorConfig();
  const merged: AIBehaviorConfig = {
    ...current,
    ...updates,
  };

  const { error } = await supabase.from("settings").upsert(
    {
      key: "ai_behavior",
      value: merged,
      description: "Admin-controlled AI conversation behavior settings",
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (error) {
    throw new Error(`Failed to save AI behavior settings: ${error.message}`);
  }

  return merged;
}

/**
 * Builds the conversational behavior prompt section based on the admin settings.
 * Note: Business facts (prices, services, policies) are strictly decoupled and
 * protected by golden rules and database knowledge tools.
 */
export function buildBehaviorPromptSection(config: AIBehaviorConfig): string {
  const lines: string[] = [
    `## Conversational behavior (Admin Configured)`,
    `- Tone: ${config.tone}`,
    `- Friendliness level: ${config.friendliness}`,
    `- Professionalism level: ${config.professionalism}`,
    `- Creativity mode: ${config.creativity} (Creative with communication, strictly accurate with business facts)`,
    `- Response length: ${config.response_length} (Normally 1–4 short sentences; mobile-friendly, never write essays or overwhelm the customer)`,
    `- Emoji usage: ${config.emoji_usage} (Occasional natural emoji, never overused)`,
    `- Greeting style: ${config.greeting_style}`,
    `- Sales approach: ${config.sales_approach}`,
    `- Question pacing: ${config.question_frequency === "one_at_a_time" ? "Ask only ONE question at a time to avoid overwhelming the customer" : config.question_frequency}`,
  ];

  if (config.language_mirroring) {
    lines.push(
      `- Multilingual & Style Mirroring: Always understand and naturally mirror the customer's latest language and register (English, Sinhala script, Tamil script, Singlish, Tanglish, or natural code-switching). Do NOT automatically convert Singlish or Tanglish into formal English.`
    );
  }

  if (config.whatsapp_formatting) {
    lines.push(
      `- WhatsApp Formatting: Keep messages concise and mobile-readable using short paragraphs and simple bullet points for lists. Avoid giant walls of text.`
    );
  }

  if (config.human_escalation_behavior) {
    lines.push(`- Human Escalation Behavior: ${config.human_escalation_behavior}`);
  }

  if (config.custom_instructions && config.custom_instructions.trim()) {
    lines.push(
      `\n## Additional Admin Directives\n${config.custom_instructions.trim()}`
    );
  }

  return lines.join("\n");
}
