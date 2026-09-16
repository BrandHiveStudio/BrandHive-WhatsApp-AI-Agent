import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { getAIBehaviorConfig } from "@/lib/ai-behavior";
import { getRequiredEnv } from "@/lib/env";
import { KNOWLEDGE_TOOLS, executeToolCall } from "@/lib/ai-tools";
import type { AIBehaviorConfig } from "@/lib/types";

let _geminiClient: OpenAI | null = null;

// Lazy singleton for Google Gemini using Google's official OpenAI-compatible endpoint.
// Fails clearly on first real use if GEMINI_API_KEY is missing, not at module import / build time.
function getGeminiClient(): OpenAI {
  if (!_geminiClient) {
    _geminiClient = new OpenAI({
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: getRequiredEnv("GEMINI_API_KEY"),
    });
  }
  return _geminiClient;
}

const FALLBACK_MESSAGE = "Sorry, I couldn't generate a response.";
const MAX_TOOL_ITERATIONS = 5;

let _activeModelOverride: string | null = null;

async function createCompletionWithRetry(
  params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
): Promise<OpenAI.Chat.ChatCompletion> {
  const maxRetries = 2;
  let currentParams = { ...params };
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await getGeminiClient().chat.completions.create(currentParams);
      if (currentParams.model !== params.model) {
        _activeModelOverride = currentParams.model;
      }
      return response;
    } catch (err: unknown) {
      const isTransient =
        err instanceof Error &&
        (err.message.includes("429") ||
          err.message.includes("503") ||
          err.message.includes("500") ||
          [429, 500, 503].includes((err as { status?: number }).status ?? 0));

      if (isTransient && attempt < maxRetries) {
        if (currentParams.model === "gemini-3.6-flash") {
          currentParams = { ...currentParams, model: "gemini-3.5-flash" };
          _activeModelOverride = "gemini-3.5-flash";
        } else if (currentParams.model === "gemini-3.5-flash") {
          currentParams = { ...currentParams, model: "gemini-3.5-flash-lite" };
          _activeModelOverride = "gemini-3.5-flash-lite";
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Failed to create completion");
}

export async function getAIResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  behaviorOverride?: Partial<AIBehaviorConfig>
) {
  // Google Gemini API retired gemini-2.5-flash for new keys (HTTP 404: "This model models/gemini-2.5-flash
  // is no longer available to new users. Please update your code to use models/gemini-3.6-flash").
  // Automatically map retired gemini-2.5-flash to Google's active replacement gemini-3.6-flash.
  const rawModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const model = _activeModelOverride || (rawModel === "gemini-2.5-flash" ? "gemini-3.6-flash" : rawModel);

  const activeBehavior = behaviorOverride
    ? { ...(await getAIBehaviorConfig()), ...behaviorOverride }
    : await getAIBehaviorConfig();

  const systemContent = buildSystemPrompt(activeBehavior);

  const conversation: ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...messages,
  ];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const isFinalIteration = i === MAX_TOOL_ITERATIONS - 1;
    const completion = await createCompletionWithRetry({
      model,
      messages: conversation,
      tools: isFinalIteration ? undefined : KNOWLEDGE_TOOLS,
      tool_choice: isFinalIteration ? "none" : "auto",
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
