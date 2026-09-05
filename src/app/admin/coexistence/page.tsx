import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import CoexistenceClient from "./coexistence-client";

export const metadata = {
  title: "WhatsApp Business App Coexistence | BrandHive Studio Admin",
  description:
    "Administrative portal for WhatsApp Business App + Cloud API coexistence onboarding.",
};

export default async function CoexistencePage() {
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

  const appId = process.env.NEXT_PUBLIC_META_APP_ID || "1395774185211806";
  const configId =
    process.env.NEXT_PUBLIC_META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID || "";

  return (
    <CoexistenceClient
      appId={appId}
      configId={configId}
      userEmail={user.email || "staff@brandhive.io"}
    />
  );
}
