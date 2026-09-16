import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import BrandingClient from "./branding-client";

export const metadata = {
  title: "Branding & Logo Settings | BrandHive Studio Admin",
  description: "Configure BrandHive Studio logo and branding assets.",
};

export default async function BrandingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    redirect("/login");
  }

  return <BrandingClient userEmail={user.email || "staff@brandhive.io"} />;
}
