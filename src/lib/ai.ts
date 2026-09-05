import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { BRANDHIVE_AGENT_SCRIPT, KNOWLEDGE_TOOL_RULES } from "@/lib/system-prompt";
import { getRequiredEnv } from "@/lib/env";
import { KNOWLEDGE_TOOLS, executeToolCall } from "@/lib/ai-tools";

let _openai: OpenAI | null = null;

// Lazy singleton (mirrors lib/supabase.ts) so a missing OPENROUTER_API_KEY
// fails clearly on first real use, not at module import / build time.
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: getRequiredEnv("OPENROUTER_API_KEY"),
    });
  }
  return _openai;
}

const FALLBACK_MESSAGE = "Sorry, I couldn't generate a response.";
const MAX_TOOL_ITERATIONS = 4;

export async function getAIResponse(
  messages: { role: "user" | "assistant"; content: string }[]
) {
  const model = process.env.AI_MODEL || "anthropic/claude-sonnet-4-20250514";

  const conversation: ChatCompletionMessageParam[] = [
    { role: "system", content: `${BRANDHIVE_AGENT_SCRIPT}\n\n${KNOWLEDGE_TOOL_RULES}` },
    ...messages,
  ];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const completion = await getOpenAI().chat.completions.create({
      model,
      messages: conversation,
      tools: KNOWLEDGE_TOOLS,
      tool_choice: "auto",
    });

    const message = completion.choices[0]?.message;
    if (!message) return FALLBACK_MESSAGE;

    const toolCalls = message.tool_calls?.filter((tc) => tc.type === "function") ?? [];

    if (toolCalls.length === 0) {
      return message.content || FALLBACK_MESSAGE;
    }

    conversation.push(message);

    for (const toolCall of toolCalls) {
      const result = await executeToolCall(toolCall.function.name, toolCall.function.arguments);
      conversation.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  return FALLBACK_MESSAGE;
}
