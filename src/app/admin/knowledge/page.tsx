import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import KnowledgeClient from "./knowledge-client";

export const metadata = {
  title: "AI Knowledge Base | BrandHive Studio Admin",
  description: "Authoritative BrandHive Studio services, packages, pricing, add-ons, and FAQs.",
};

export default async function KnowledgePage() {
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

  // Fetch all authoritative knowledge data in parallel
  const [
    { data: services },
    { data: addons },
    { data: faqs },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq("active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("service_addons")
      .select("*")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("faqs")
      .select("*")
      .eq("active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("settings")
      .select("*")
      .eq("active", true)
      .order("key", { ascending: true }),
  ]);

  return (
    <KnowledgeClient
      services={services ?? []}
      addons={addons ?? []}
      faqs={faqs ?? []}
      settings={settings ?? []}
      userEmail={user.email || "staff@brandhive.io"}
    />
  );
}
