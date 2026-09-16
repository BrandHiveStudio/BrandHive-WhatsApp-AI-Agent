import { NextResponse } from "next/server";
import { requireStaffUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    await requireStaffUser();

    // Fetch all active authoritative knowledge items via service_role client
    const [
      { data: services, error: servicesErr },
      { data: addons, error: addonsErr },
      { data: faqs, error: faqsErr },
      { data: settings, error: settingsErr },
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

    if (servicesErr) throw servicesErr;
    if (addonsErr) throw addonsErr;
    if (faqsErr) throw faqsErr;
    if (settingsErr) throw settingsErr;

    return NextResponse.json({
      services: services ?? [],
      addons: addons ?? [],
      faqs: faqs ?? [],
      settings: settings ?? [],
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
