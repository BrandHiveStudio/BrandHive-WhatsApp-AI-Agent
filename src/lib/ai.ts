import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { getAIBehaviorConfig } from "@/lib/ai-behavior";
import { getRequiredEnv } from "@/lib/env";
import { KNOWLEDGE_TOOLS, executeToolCall } from "@/lib/ai-tools";
import type { AIBehaviorConfig } from "@/lib/types";

let _geminiClient: OpenAI | null = null;

export const PRIMARY_GEMINI_MODEL = "gemini-3.5-flash-lite";
export const RECOVERY_GEMINI_MODEL = "gemini-flash-lite-latest";
export const GEMINI_REQUEST_TIMEOUT_MS = 8000; // 8-second request timeout to prevent hanging beyond Meta webhook cutoff

export function resetGeminiClient(): void {
  _geminiClient = null;
}

// Lazy singleton for Google Gemini using Google's official OpenAI-compatible endpoint.
// Configured with strict 8-second timeout and zero internal SDK retries for bounded behavior.
function getGeminiClient(): OpenAI {
  if (!_geminiClient) {
    _geminiClient = new OpenAI({
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: getRequiredEnv("GEMINI_API_KEY"),
      timeout: GEMINI_REQUEST_TIMEOUT_MS,
      maxRetries: 0,
    });
  }
  return _geminiClient;
}

const FALLBACK_MESSAGE = "Sorry, I couldn't generate a response.";
const MAX_TOOL_ITERATIONS = 5;

let _activeModelOverride: string | null = null;

export function resetActiveModelOverride(): void {
  _activeModelOverride = null;
}

export function resolveDefaultModel(): string {
  if (_activeModelOverride) return _activeModelOverride;
  const envModel = process.env.GEMINI_MODEL;
  // If unset or pointing to retired/throttled legacy models (gemini-2.5-flash, gemini-3.6-flash, gemini-3.5-flash),
  // directly use the verified fast primary model: gemini-3.5-flash-lite.
  if (
    !envModel ||
    envModel === "gemini-2.5-flash" ||
    envModel === "gemini-3.6-flash" ||
    envModel === "gemini-3.5-flash"
  ) {
    return PRIMARY_GEMINI_MODEL;
  }
  return envModel;
}

async function createCompletionWithRetry(
  params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
): Promise<OpenAI.Chat.ChatCompletion> {
  // Bounded retry: at most 1 recovery attempt, never retrying rate-limit errors repeatedly
  const maxRetries = 1;
  let currentParams = { ...params };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await getGeminiClient().chat.completions.create(currentParams);
      if (currentParams.model !== params.model) {
        _activeModelOverride = currentParams.model;
      }
      return response;
    } catch (err: unknown) {
      const status = (err as { status?: number }).status ?? 0;
      const message = err instanceof Error ? err.message : "";
      const isRateLimit = status === 429 || message.includes("429");
      const isServerError = status === 500 || status === 503 || message.includes("500") || message.includes("503");
      const isTimeout = message.includes("timeout") || message.includes("ETIMEDOUT") || (err as { code?: string }).code === "ETIMEDOUT";

      const canRecover = (isRateLimit || isServerError || isTimeout) && attempt < maxRetries;

      if (canRecover) {
        // Safe recovery path: switch to backup lite model once; do not loop or delay repeatedly
        const nextModel =
          currentParams.model === PRIMARY_GEMINI_MODEL
            ? RECOVERY_GEMINI_MODEL
            : PRIMARY_GEMINI_MODEL;

        currentParams = { ...currentParams, model: nextModel };
        _activeModelOverride = nextModel;
        // Bounded brief pause (500ms max)
        await new Promise((resolve) => setTimeout(resolve, 500));
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
  const model = resolveDefaultModel();

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
