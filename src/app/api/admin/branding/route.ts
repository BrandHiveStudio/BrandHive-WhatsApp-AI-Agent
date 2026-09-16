import { NextResponse } from "next/server";
import { requireStaffUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const DEFAULT_BRANDING = {
  logoUrl: "/brandhive-logo-master.png",
  logoData: null,
  isDefault: true,
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  try {
    await requireStaffUser();

    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "branding_logo")
      .maybeSingle();

    if (data?.value && typeof data.value === "object") {
      return NextResponse.json({
        branding: {
          ...DEFAULT_BRANDING,
          ...(data.value as Record<string, unknown>),
        },
      });
    }

    return NextResponse.json({ branding: DEFAULT_BRANDING });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ branding: DEFAULT_BRANDING });
  }
}

export async function PUT(request: Request) {
  try {
    await requireStaffUser();
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { logoData, isDefault } = body;

    if (isDefault) {
      // Reset to default
      await supabase.from("settings").upsert({
        key: "branding_logo",
        value: DEFAULT_BRANDING,
        description: "BrandHive Studio custom logo & branding configuration",
        active: true,
        updated_at: new Date().toISOString(),
      });
      return NextResponse.json({ branding: DEFAULT_BRANDING });
    }

    if (logoData && typeof logoData === "string") {
      // Basic data URL validation
      if (!logoData.startsWith("data:image/")) {
        return NextResponse.json(
          { error: "Invalid image format. Must be a valid image data URL." },
          { status: 400 }
        );
      }

      // Max size guard (~2MB base64 string length ~2.8MB)
      if (logoData.length > 3 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Image size exceeds 2MB limit." },
          { status: 400 }
        );
      }

      const brandingValue = {
        logoUrl: logoData,
        logoData,
        isDefault: false,
        updatedAt: new Date().toISOString(),
      };

      await supabase.from("settings").upsert({
        key: "branding_logo",
        value: brandingValue,
        description: "BrandHive Studio custom logo & branding configuration",
        active: true,
        updated_at: new Date().toISOString(),
      });

      return NextResponse.json({ branding: brandingValue });
    }

    return NextResponse.json({ error: "No valid logo provided" }, { status: 400 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
