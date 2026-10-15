import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { requireStaffUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { message } = body;

  if (!message?.trim()) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  // Get conversation to find phone number
  const { data: conversation, error: convoError } = await supabase
    .from("conversations")
    .select("phone")
    .eq("id", id)
    .single();

  if (convoError || !conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Send via WhatsApp
  let waRes: any;
  try {
    waRes = await sendWhatsAppMessage(conversation.phone, message);
  } catch (networkErr) {
    console.error(
      "WhatsApp Cloud API dispatch error:",
      networkErr instanceof Error ? networkErr.message : networkErr
    );
    return Response.json(
      { error: "Failed to connect to WhatsApp Cloud API. Please check your network connection and retry." },
      { status: 502 }
    );
  }

  const wamid = waRes?.messages?.[0]?.id;
  if (!wamid || typeof wamid !== "string") {
    console.error("Meta WhatsApp Cloud API rejected message:", waRes?.error || waRes);
    const metaErrorMsg = typeof waRes?.error?.message === "string" ? waRes.error.message : null;
    const safeErrorMsg = metaErrorMsg
      ? `WhatsApp delivery failed: ${metaErrorMsg}`
      : "Failed to send message via WhatsApp. No confirmation ID was returned by WhatsApp.";

    return Response.json({ error: safeErrorMsg }, { status: 502 });
  }

  // Store in DB only after confirmed WhatsApp acceptance with valid wamid
  const { data: msg, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: id,
      role: "assistant",
      direction: "out",
      whatsapp_type: "text",
      content: message,
      whatsapp_msg_id: wamid,
      ai_reply_sent: false,
    })
    .select()
    .single();

  if (msgError) {
    return Response.json({ error: msgError.message }, { status: 500 });
  }

  // Update conversation timestamp
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  return Response.json(msg);
}
