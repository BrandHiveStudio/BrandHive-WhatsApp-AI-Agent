import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser } from "@/lib/auth";
import { getAIBehaviorConfig, saveAIBehaviorConfig } from "@/lib/ai-behavior";
import type { AIBehaviorConfig } from "@/lib/types";

export async function GET() {
  const auth = await requireStaffUser();
  if ("error" in auth) return auth.error;

  try {
    const config = await getAIBehaviorConfig();
    return NextResponse.json({ config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load AI behavior settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireStaffUser();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const updates: Partial<AIBehaviorConfig> = body.config ?? body;

    const saved = await saveAIBehaviorConfig(updates);
    return NextResponse.json({ config: saved, message: "AI behavior settings updated successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save AI behavior settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  return PUT(request);
}
