import { getAIBehaviorConfig } from "@/lib/ai-behavior";
import AIBehaviorClient from "./ai-behavior-client";

export const metadata = {
  title: "AI Conversation Behavior | BrandHive Studio Admin",
  description: "Configure BrandHive AI conversational behavior, tone, pacing, and personality.",
};

export default async function AIBehaviorPage() {
  const initialConfig = await getAIBehaviorConfig();

  return <AIBehaviorClient initialConfig={initialConfig} userEmail="staff@brandhive.io" />;
}
