import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { getAIResponse } from "@/lib/ai";
import { verifyMetaSignature } from "@/lib/webhook-signature";
import { getRequiredEnv } from "@/lib/env";
import { detectMessageLanguage } from "@/lib/language-detect";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  // Read the raw body first -- signature verification must run against
  // the exact bytes Meta signed, not a re-serialized JSON.parse() copy.
  const rawBody = await request.text();

  const appSecret = getRequiredEnv("WHATSAPP_APP_SECRET");
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyMetaSignature(rawBody, signature, appSecret)) {
    console.error("Webhook signature verification failed");
    return new Response("Invalid signature", { status: 401 });
  }

  const body = JSON.parse(rawBody);

  // Only process whatsapp_business_account events
  if (body.object !== "whatsapp_business_account") {
    return Response.json({ status: "ignored" });
  }

  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  // Only process actual messages (not status updates)
  if (!value?.messages?.[0]) {
    return Response.json({ status: "no_message" });
  }

  const message = value.messages[0];
  const contact = value.contacts?.[0];

  // Only handle text messages
  if (message.type !== "text") {
    return Response.json({ status: "non_text" });
  }

  const phone = message.from;
  const text = message.text.body;
  const name = contact?.profile?.name || null;
  const whatsappMsgId = message.id;

  try {
    // Find or create conversation
    let { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("phone", phone)
      .single();

    if (!conversation) {
      const { data: newConvo, error: convoInsertError } = await supabase
        .from("conversations")
        .insert({ phone, name })
        .select()
        .single();

      if (convoInsertError?.code === "23505") {
        // Race: a concurrent delivery for the same new phone number
        // already created the conversation. Re-fetch it instead of failing.
        const { data: raceConvo } = await supabase
          .from("conversations")
          .select("*")
          .eq("phone", phone)
          .single();
        conversation = raceConvo;
      } else {
        conversation = newConvo;
      }
    } else if (name && name !== conversation.name) {
      await supabase.from("conversations").update({ name }).eq("id", conversation.id);
    }

    if (!conversation) {
      return Response.json({ error: "Failed to create conversation" }, { status: 500 });
    }

    // Store (or find) the inbound message. `ai_reply_sent` distinguishes
    // "already stored" from "already answered" -- a Meta retry of a
    // message whose AI reply previously failed must be able to retry
    // the reply, not just be silently swallowed as a duplicate.
    let inboundMessage: { id: string; ai_reply_sent: boolean } | null = null;

    const { data: existingMessage } = await supabase
      .from("messages")
      .select("id, ai_reply_sent")
      .eq("whatsapp_msg_id", whatsappMsgId)
      .maybeSingle();

    if (existingMessage) {
      if (existingMessage.ai_reply_sent) {
        return Response.json({ status: "duplicate_already_replied" });
      }
      inboundMessage = existingMessage;
    } else {
      const { data: newMessage, error: insertError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          role: "user",
          content: text,
          whatsapp_msg_id: whatsappMsgId,
        })
        .select("id, ai_reply_sent")
        .single();

      if (insertError?.code === "23505") {
        // Race: a concurrent delivery already inserted this exact message.
        const { data: raceMessage } = await supabase
          .from("messages")
          .select("id, ai_reply_sent")
          .eq("whatsapp_msg_id", whatsappMsgId)
          .single();

        if (raceMessage?.ai_reply_sent) {
          return Response.json({ status: "duplicate_already_replied" });
        }
        inboundMessage = raceMessage ?? null;
      } else if (insertError || !newMessage) {
        console.error(
          "Failed to store inbound message:",
          insertError?.message ?? "unknown error"
        );
        return Response.json({ status: "error" }, { status: 500 });
      } else {
        inboundMessage = newMessage;
      }
    }

    if (!inboundMessage) {
      return Response.json({ status: "error" }, { status: 500 });
    }

    // Update conversation timestamp and the coarse detected script/language
    // (deterministic, code-only -- see lib/language-detect.ts). This is
    // write-only for now: it's not yet fed back into the AI's context or a
    // dashboard filter, just persisted for a later phase to use.
    const detectedLanguage = detectMessageLanguage(text);
    await supabase
      .from("conversations")
      .update({
        updated_at: new Date().toISOString(),
        language: detectedLanguage ?? conversation.language,
      })
      .eq("id", conversation.id);

    // If mode is 'human', don't auto-reply
    if (conversation.mode === "human") {
      return Response.json({ status: "stored_for_human" });
    }

    // Fetch the most recent messages for context: order by newest
    // first so LIMIT keeps the latest N, then reverse back into
    // chronological order for the model.
    const { data: recentDesc } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const history = (recentDesc || [])
      .slice()
      .reverse()
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Get AI response
    const aiResponse = await getAIResponse(history);

    // Send response via WhatsApp
    await sendWhatsAppMessage(phone, aiResponse);

    // Store AI response and mark the inbound message as successfully answered.
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: aiResponse,
    });

    await supabase.from("messages").update({ ai_reply_sent: true }).eq("id", inboundMessage.id);

    // Update conversation timestamp again
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation.id);

    return Response.json({ status: "replied" });
  } catch (error) {
    console.error("Webhook error:", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ status: "error" }, { status: 500 });
  }
}
