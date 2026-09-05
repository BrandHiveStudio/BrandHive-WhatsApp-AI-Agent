import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireStaffUser } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();

  if (body.mode && !["agent", "human"].includes(body.mode)) {
    return Response.json({ error: "Invalid mode" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("conversations")
    .update({ mode: body.mode })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}
