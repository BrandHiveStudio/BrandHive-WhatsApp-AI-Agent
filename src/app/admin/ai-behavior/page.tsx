import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getAIBehaviorConfig } from "@/lib/ai-behavior";
import AIBehaviorClient from "./ai-behavior-client";

export const metadata = {
  title: "AI Conversation Behavior | BrandHive Studio Admin",
  description: "Configure BrandHive AI conversational behavior, tone, pacing, and personality.",
};

export default async function AIBehaviorPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Enforce staff profile authorization
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    redirect("/login");
  }

  const initialConfig = await getAIBehaviorConfig();

  return <AIBehaviorClient initialConfig={initialConfig} userEmail={user.email || "staff@brandhive.io"} />;
}
