import { supabase as supabaseAdmin } from "@/lib/supabase";
import KnowledgeClient from "./knowledge-client";

export const metadata = {
  title: "AI Knowledge Base | BrandHive Studio Admin",
  description: "Authoritative BrandHive Studio services, packages, pricing, add-ons, and FAQs.",
};

export default async function KnowledgePage() {
  // Fetch all authoritative knowledge data in parallel using service client
  const [
    { data: services },
    { data: addons },
    { data: faqs },
    { data: settings },
  ] = await Promise.all([
    supabaseAdmin
      .from("services")
      .select("*")
      .order("display_order", { ascending: true }),
    supabaseAdmin
      .from("service_addons")
      .select("*")
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("faqs")
      .select("*")
      .order("display_order", { ascending: true }),
    supabaseAdmin
      .from("settings")
      .select("*")
      .order("key", { ascending: true }),
  ]);

  return (
    <KnowledgeClient
      services={services ?? []}
      addons={addons ?? []}
      faqs={faqs ?? []}
      settings={settings ?? []}
      userEmail="staff@brandhive.io"
    />
  );
}
