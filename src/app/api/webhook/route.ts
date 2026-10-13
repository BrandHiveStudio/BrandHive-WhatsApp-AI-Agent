import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { getAIResponse } from "@/lib/ai";
import { verifyMetaSignature } from "@/lib/webhook-signature";
import { getRequiredEnv } from "@/lib/env";
import { detectMessageLanguage } from "@/lib/language-detect";
import {
  extractInboundContent,
  extractEchoContent,
  parseMetaTimestamp,
  normalizePhoneNumber,
  isEchoChange,
  isIncomingMessageChange,
} from "@/lib/webhook-parser";

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

  let body: Record<string, any>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only process whatsapp_business_account events
  if (body.object !== "whatsapp_business_account") {
    return Response.json({ status: "ignored" });
  }

  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  if (!changes || typeof changes !== "object") {
    return Response.json({ status: "no_changes" });
  }

  const value = changes.value;
  if (!value || typeof value !== "object") {
    return Response.json({ status: "no_value" });
  }

  try {
    // =========================================================================
    // 1. WhatsApp Business App Coexistence: SMB Message Echoes
    // Messages sent by staff from the physical WhatsApp Business app or linked devices
    // =========================================================================
    if (isEchoChange(changes)) {
      const echoes: Record<string, any>[] = Array.isArray(value.message_echoes)
        ? value.message_echoes
        : [];

      if (echoes.length === 0) {
        return Response.json({ status: "no_echoes" });
      }

      for (const echo of echoes) {
        const customerPhone = normalizePhoneNumber(echo.to);
        const whatsappMsgId = echo.id;

        if (!customerPhone || !whatsappMsgId) {
          continue;
        }

        const { text: echoText, whatsappType } = extractEchoContent(echo);
        const echoCreatedAt = parseMetaTimestamp(echo.timestamp);

        // Find or create conversation for the customer
        let { data: conversation } = await supabase
          .from("conversations")
          .select("*")
          .eq("phone", customerPhone)
          .single();

        if (!conversation) {
          const { data: newConvo, error: convoInsertError } = await supabase
            .from("conversations")
            .insert({
              phone: customerPhone,
              mode: "human", // Human initiated the conversation via WhatsApp Business app
              needs_human: true,
              last_agent_message_at: echoCreatedAt,
              updated_at: echoCreatedAt,
            })
            .select()
            .single();

          if (convoInsertError?.code === "23505") {
            // Race condition: concurrent creation
            const { data: raceConvo } = await supabase
              .from("conversations")
              .select("*")
              .eq("phone", customerPhone)
              .single();
            conversation = raceConvo;
          } else {
            conversation = newConvo;
          }
        }

        if (!conversation) {
          console.error("Failed to establish conversation for echo:", customerPhone);
          return Response.json({ error: "Failed to establish conversation" }, { status: 500 });
        }

        // Deduplication: Check if echo already exists in messages
        const { data: existingEcho } = await supabase
          .from("messages")
          .select("id")
          .eq("whatsapp_msg_id", whatsappMsgId)
          .maybeSingle();

        if (existingEcho) {
          // Duplicate delivery: safely acknowledge without overwriting mode
          return Response.json({ status: "echo_duplicate" });
        }

        // Persist outgoing app-originated message
        const { error: msgInsertError } = await supabase.from("messages").insert({
          conversation_id: conversation.id,
          role: "assistant",
          direction: "out",
          whatsapp_type: whatsappType,
          content: echoText,
          whatsapp_msg_id: whatsappMsgId,
          ai_reply_sent: true,
          created_at: echoCreatedAt,
        });

        if (msgInsertError && msgInsertError.code !== "23505") {
          console.error("Failed to insert echo message:", msgInsertError.message);
          return Response.json({ error: msgInsertError.message }, { status: 500 });
        }

        // Switch conversation to Human mode so AI pauses and does not talk over the human
        await supabase
          .from("conversations")
          .update({
            mode: "human",
            needs_human: true,
            last_agent_message_at: echoCreatedAt,
            updated_at: echoCreatedAt,
          })
          .eq("id", conversation.id);
      }

      // CRITICAL: Echoes must NEVER trigger an AI reply or send another WhatsApp message!
      return Response.json({ status: "echo_processed" });
    }

    // =========================================================================
    // 2. Inbound Customer Messages (Text and Supported Non-Text Formats)
    // =========================================================================
    if (isIncomingMessageChange(changes) || Boolean(value.messages?.[0])) {
      const messages: Record<string, any>[] = Array.isArray(value.messages) ? value.messages : [];
      if (messages.length === 0) {
        return Response.json({ status: "no_message" });
      }

      const message = messages[0];
      const contact = value.contacts?.[0];
      const phone = normalizePhoneNumber(message.from);

      if (!phone) {
        return Response.json({ status: "missing_phone" }, { status: 400 });
      }

      const { text, whatsappType } = extractInboundContent(message);
      const name = contact?.profile?.name || null;
      const whatsappMsgId = message.id;
      const messageCreatedAt = parseMetaTimestamp(message.timestamp);

      // Find or create conversation
      let { data: conversation } = await supabase
        .from("conversations")
        .select("*")
        .eq("phone", phone)
        .single();

      if (!conversation) {
        const { data: newConvo, error: convoInsertError } = await supabase
          .from("conversations")
          .insert({
            phone,
            name,
            last_customer_message_at: messageCreatedAt,
            updated_at: messageCreatedAt,
          })
          .select()
          .single();

        if (convoInsertError?.code === "23505") {
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

      // Deduplication check
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
            direction: "in",
            whatsapp_type: whatsappType,
            content: text,
            whatsapp_msg_id: whatsappMsgId,
            created_at: messageCreatedAt,
          })
          .select("id, ai_reply_sent")
          .single();

        if (insertError?.code === "23505") {
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

      // Update conversation timestamp, last_customer_message_at, and detected language
      const detectedLanguage = detectMessageLanguage(text);
      await supabase
        .from("conversations")
        .update({
          last_customer_message_at: messageCreatedAt,
          updated_at: new Date().toISOString(),
          language: detectedLanguage ?? conversation.language,
        })
        .eq("id", conversation.id);

      // If mode is 'human', AI replies are paused
      if (conversation.mode === "human") {
        return Response.json({ status: "stored_for_human" });
      }

      // Fetch recent messages for Gemini context
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

      // Get AI response and send via WhatsApp
      const aiResponse = await getAIResponse(history);
      await sendWhatsAppMessage(phone, aiResponse);

      // Store AI response
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        role: "assistant",
        direction: "out",
        whatsapp_type: "text",
        content: aiResponse,
      });

      // Mark inbound message as answered
      await supabase.from("messages").update({ ai_reply_sent: true }).eq("id", inboundMessage.id);

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({
          last_agent_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation.id);

      return Response.json({ status: "replied" });
    }

    // =========================================================================
    // 3. Message Status Updates (Delivery & Read Receipts)
    // =========================================================================
    if (Array.isArray(value.statuses) && value.statuses.length > 0) {
      const status = value.statuses[0];
      if (status.id && status.status) {
        const validStatuses = ["sent", "delivered", "read", "failed"];
        if (validStatuses.includes(status.status)) {
          await supabase
            .from("messages")
            .update({ wa_status: status.status })
            .eq("whatsapp_msg_id", status.id);
        }
      }
      return Response.json({ status: "status_received" });
    }

    // Any other webhook event (e.g. account updates, security notifications)
    return Response.json({ status: "ignored" });
  } catch (error) {
    console.error("Webhook error:", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ status: "error" }, { status: 500 });
  }
}
