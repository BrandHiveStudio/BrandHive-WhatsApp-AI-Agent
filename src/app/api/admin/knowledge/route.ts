import { NextResponse } from "next/server";
import { requireStaffUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function parsePrice(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.-]+/g, "");
    if (!cleaned) return null;
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

function handleSupabaseError(operation: string, section: string, error: { message?: string; code?: string; details?: string | null; hint?: string | null }) {
  console.error(`[api/admin/knowledge] Supabase error in ${operation} ${section}:`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });

  const statusCode = error.code === "42501" ? 403 : 400;
  const errorMsg = error.hint
    ? `${error.message} (${error.hint})`
    : error.message || "Database operation rejected";

  return NextResponse.json(
    {
      error: errorMsg,
      code: error.code,
      details: error.details,
      hint: error.hint,
    },
    { status: statusCode }
  );
}

export async function GET() {
  const auth = await requireStaffUser();
  if ("error" in auth) return auth.error;

  try {
    const [
      { data: services, error: servicesErr },
      { data: addons, error: addonsErr },
      { data: faqs, error: faqsErr },
      { data: settings, error: settingsErr },
    ] = await Promise.all([
      supabase
        .from("services")
        .select("*")
        .order("display_order", { ascending: true }),
      supabase
        .from("service_addons")
        .select("*")
        .order("name", { ascending: true }),
      supabase
        .from("faqs")
        .select("*")
        .order("display_order", { ascending: true }),
      supabase
        .from("settings")
        .select("*")
        .order("key", { ascending: true }),
    ]);

    if (servicesErr) return handleSupabaseError("GET", "services", servicesErr);
    if (addonsErr) return handleSupabaseError("GET", "addons", addonsErr);
    if (faqsErr) return handleSupabaseError("GET", "faqs", faqsErr);
    if (settingsErr) return handleSupabaseError("GET", "settings", settingsErr);

    return NextResponse.json({
      services: services ?? [],
      addons: addons ?? [],
      faqs: faqs ?? [],
      settings: settings ?? [],
    });
  } catch (err: unknown) {
    console.error("[api/admin/knowledge] Unexpected error in GET:", err);
    const message = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireStaffUser();
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const { section, record } = body;

    if (!section || !record || typeof record !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload: section and record are required." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (section === "services") {
      if (!record.name?.trim()) {
        return NextResponse.json({ error: "Service name is required." }, { status: 400 });
      }
      const slug = record.slug?.trim() || record.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const pricing_type = ["fixed", "starting_from", "custom_quote"].includes(record.pricing_type) ? record.pricing_type : "fixed";
      let price = parsePrice(record.price);
      let starting_price = parsePrice(record.starting_price);

      // Validate pricing consistency
      if (pricing_type === "fixed" && price === null) {
        price = starting_price ?? 0;
      }
      if (pricing_type === "starting_from" && starting_price === null) {
        starting_price = price ?? 0;
      }
      if (pricing_type === "custom_quote") {
        price = null;
        starting_price = null;
      }

      const payload = {
        name: record.name.trim(),
        slug,
        category: record.category?.trim() || "general",
        description: record.description?.trim() || null,
        item_type: record.item_type === "package" ? "package" : "service",
        pricing_type,
        price,
        starting_price,
        currency: record.currency?.trim() || "LKR",
        unit: record.unit?.trim() || null,
        active: record.active !== false,
        display_order: Number(record.display_order) || 50,
        ad_budget_separate: !!record.ad_budget_separate,
        metadata: record.metadata || { inclusions: [] },
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase.from("services").insert(payload).select();
      if (error) return handleSupabaseError("POST", "services", error);
      return NextResponse.json({ success: true, record: data?.[0] || payload });
    }

    if (section === "addons") {
      if (!record.name?.trim()) {
        return NextResponse.json({ error: "Add-on name is required." }, { status: 400 });
      }
      const pricing_type = ["fixed", "starting_from", "custom_quote"].includes(record.pricing_type) ? record.pricing_type : "fixed";
      let price = parsePrice(record.price);
      let starting_price = parsePrice(record.starting_price);

      if (pricing_type === "fixed" && price === null) price = starting_price ?? 0;
      if (pricing_type === "starting_from" && starting_price === null) starting_price = price ?? 0;
      if (pricing_type === "custom_quote") { price = null; starting_price = null; }

      const payload = {
        name: record.name.trim(),
        service_id: record.service_id || null,
        description: record.description?.trim() || null,
        pricing_type,
        price,
        starting_price,
        currency: record.currency?.trim() || "LKR",
        unit: record.unit?.trim() || null,
        active: record.active !== false,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase.from("service_addons").insert(payload).select();
      if (error) return handleSupabaseError("POST", "addons", error);
      return NextResponse.json({ success: true, record: data?.[0] || payload });
    }

    if (section === "faqs") {
      if (!record.question?.trim() || !record.answer?.trim()) {
        return NextResponse.json({ error: "FAQ question and answer are required." }, { status: 400 });
      }

      const payload = {
        question: record.question.trim(),
        answer: record.answer.trim(),
        category: record.category?.trim() || "general",
        display_order: Number(record.display_order) || 50,
        active: record.active !== false,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase.from("faqs").insert(payload).select();
      if (error) return handleSupabaseError("POST", "faqs", error);
      return NextResponse.json({ success: true, record: data?.[0] || payload });
    }

    if (section === "settings") {
      if (!record.key?.trim()) {
        return NextResponse.json({ error: "Setting key is required." }, { status: 400 });
      }

      let parsedValue = record.value;
      if (typeof parsedValue === "string") {
        try {
          parsedValue = JSON.parse(parsedValue);
        } catch {
          // Keep as string
        }
      }

      const payload = {
        key: record.key.trim(),
        value: parsedValue,
        description: record.description?.trim() || null,
        active: record.active !== false,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase.from("settings").insert(payload).select();
      if (error) return handleSupabaseError("POST", "settings", error);
      return NextResponse.json({ success: true, record: data?.[0] || payload });
    }

    return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 });
  } catch (err: unknown) {
    console.error("[api/admin/knowledge] Unexpected error in POST:", err);
    const message = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireStaffUser();
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const { section, id, key, record } = body;

    if (!section || (!id && !key) || !record || typeof record !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload: section, id (or key), and record are required." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (section === "services") {
      const updates: Record<string, unknown> = { updated_at: now };
      if (record.name !== undefined) updates.name = record.name.trim();
      if (record.slug !== undefined) updates.slug = record.slug.trim();
      if (record.category !== undefined) updates.category = record.category.trim();
      if (record.description !== undefined) updates.description = record.description ? record.description.trim() : null;
      if (record.item_type !== undefined) updates.item_type = record.item_type === "package" ? "package" : "service";
      if (record.pricing_type !== undefined) updates.pricing_type = record.pricing_type;
      if (record.price !== undefined) updates.price = parsePrice(record.price);
      if (record.starting_price !== undefined) updates.starting_price = parsePrice(record.starting_price);
      if (record.currency !== undefined) updates.currency = record.currency.trim();
      if (record.unit !== undefined) updates.unit = record.unit ? record.unit.trim() : null;
      if (record.active !== undefined) updates.active = !!record.active;
      if (record.display_order !== undefined) updates.display_order = Number(record.display_order) || 50;
      if (record.ad_budget_separate !== undefined) updates.ad_budget_separate = !!record.ad_budget_separate;
      if (record.metadata !== undefined) updates.metadata = record.metadata;

      // Ensure pricing consistency if pricing_type is being updated or set
      if (updates.pricing_type === "fixed" && updates.price === null && updates.starting_price !== undefined) {
        updates.price = updates.starting_price;
      }
      if (updates.pricing_type === "starting_from" && updates.starting_price === null && updates.price !== undefined) {
        updates.starting_price = updates.price;
      }
      if (updates.pricing_type === "custom_quote") {
        updates.price = null;
        updates.starting_price = null;
      }

      const { data, error } = await supabase.from("services").update(updates).eq("id", id).select();
      if (error) return handleSupabaseError("PUT", "services", error);
      return NextResponse.json({ success: true, record: data?.[0] || { id, ...updates } });
    }

    if (section === "addons") {
      const updates: Record<string, unknown> = { updated_at: now };
      if (record.name !== undefined) updates.name = record.name.trim();
      if (record.service_id !== undefined) updates.service_id = record.service_id || null;
      if (record.description !== undefined) updates.description = record.description ? record.description.trim() : null;
      if (record.pricing_type !== undefined) updates.pricing_type = record.pricing_type;
      if (record.price !== undefined) updates.price = parsePrice(record.price);
      if (record.starting_price !== undefined) updates.starting_price = parsePrice(record.starting_price);
      if (record.currency !== undefined) updates.currency = record.currency.trim();
      if (record.unit !== undefined) updates.unit = record.unit ? record.unit.trim() : null;
      if (record.active !== undefined) updates.active = !!record.active;

      const { data, error } = await supabase.from("service_addons").update(updates).eq("id", id).select();
      if (error) return handleSupabaseError("PUT", "addons", error);
      return NextResponse.json({ success: true, record: data?.[0] || { id, ...updates } });
    }

    if (section === "faqs") {
      const updates: Record<string, unknown> = { updated_at: now };
      if (record.question !== undefined) updates.question = record.question.trim();
      if (record.answer !== undefined) updates.answer = record.answer.trim();
      if (record.category !== undefined) updates.category = record.category ? record.category.trim() : null;
      if (record.display_order !== undefined) updates.display_order = Number(record.display_order) || 50;
      if (record.active !== undefined) updates.active = !!record.active;

      const { data, error } = await supabase.from("faqs").update(updates).eq("id", id).select();
      if (error) return handleSupabaseError("PUT", "faqs", error);
      return NextResponse.json({ success: true, record: data?.[0] || { id, ...updates } });
    }

    if (section === "settings") {
      const targetKey = key || id;
      const updates: Record<string, unknown> = { updated_at: now };
      if (record.value !== undefined) {
        let parsedValue = record.value;
        if (typeof parsedValue === "string") {
          try {
            parsedValue = JSON.parse(parsedValue);
          } catch {
            // Keep string
          }
        }
        updates.value = parsedValue;
      }
      if (record.description !== undefined) updates.description = record.description ? record.description.trim() : null;
      if (record.active !== undefined) updates.active = !!record.active;

      const { data, error } = await supabase.from("settings").update(updates).eq("key", targetKey).select();
      if (error) return handleSupabaseError("PUT", "settings", error);
      return NextResponse.json({ success: true, record: data?.[0] || { key: targetKey, ...updates } });
    }

    return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 });
  } catch (err: unknown) {
    console.error("[api/admin/knowledge] Unexpected error in PUT:", err);
    const message = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireStaffUser();
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const { section, id, key, permanent } = body;

    if (!section || (!id && !key)) {
      return NextResponse.json(
        { error: "Invalid request payload: section and id (or key) are required." },
        { status: 400 }
      );
    }

    const tableMap: Record<string, string> = {
      services: "services",
      addons: "service_addons",
      faqs: "faqs",
      settings: "settings",
    };

    const tableName = tableMap[section];
    if (!tableName) {
      return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 });
    }

    const idField = section === "settings" ? "key" : "id";
    const targetId = (section === "settings" ? key : id) || id;

    if (permanent) {
      const { error } = await supabase.from(tableName).delete().eq(idField, targetId);
      if (error) return handleSupabaseError("DELETE", section, error);
      return NextResponse.json({ success: true, deleted: true, permanent: true, id: targetId });
    } else {
      // Soft-delete / Archive (set active = false)
      const { data, error } = await supabase
        .from(tableName)
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq(idField, targetId)
        .select();

      if (error) return handleSupabaseError("DELETE", section, error);
      return NextResponse.json({ success: true, archived: true, permanent: false, record: data?.[0] });
    }
  } catch (err: unknown) {
    console.error("[api/admin/knowledge] Unexpected error in DELETE:", err);
    const message = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
