import type { Message } from "@/lib/types";

/**
 * Merges incoming messages into current message list:
 * - Deduplicates by primary id and by whatsapp_msg_id.
 * - Updates existing messages in place when fields (e.g. wa_status, ai_reply_sent, content) change.
 * - Appends new messages and returns a new array sorted chronologically by created_at ascending.
 */
export function mergeMessages(current: Message[], incoming: (Message | Partial<Message>)[]): Message[] {
  if (!incoming || incoming.length === 0) return current;

  // Filter valid incoming messages that have at least an id or whatsapp_msg_id
  const validIncoming = incoming.filter(
    (m): m is Message => Boolean(m && (m.id || m.whatsapp_msg_id) && m.created_at)
  );

  if (validIncoming.length === 0) return current;

  const map = new Map<string, Message>();
  const waMap = new Map<string, string>(); // whatsapp_msg_id -> primary id

  // Seed with current messages
  for (const m of current) {
    if (m.id) {
      map.set(m.id, { ...m });
      if (m.whatsapp_msg_id) {
        waMap.set(m.whatsapp_msg_id, m.id);
      }
    }
  }

  // Merge or insert incoming
  for (const inc of validIncoming) {
    let existingId: string | undefined;

    if (inc.id && map.has(inc.id)) {
      existingId = inc.id;
    } else if (inc.whatsapp_msg_id && waMap.has(inc.whatsapp_msg_id)) {
      existingId = waMap.get(inc.whatsapp_msg_id);
    }

    if (existingId && map.has(existingId)) {
      const existing = map.get(existingId)!;
      const updated: Message = {
        ...existing,
        ...inc,
        id: existing.id || inc.id,
      };
      map.set(existingId, updated);
      if (updated.whatsapp_msg_id) {
        waMap.set(updated.whatsapp_msg_id, existingId);
      }
    } else if (inc.id) {
      map.set(inc.id, { ...inc });
      if (inc.whatsapp_msg_id) {
        waMap.set(inc.whatsapp_msg_id, inc.id);
      }
    }
  }

  // Return sorted by created_at ascending
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

/**
 * Checks whether a Realtime postgres_changes payload was stripped/sanitized by Supabase RLS.
 * When RLS blocks client SELECT access, payload.new is an empty object {} or missing conversation_id.
 */
export function isPayloadSanitized(newRow?: Partial<Message> | null): boolean {
  if (!newRow || typeof newRow !== "object") return true;
  // A genuine message payload contains conversation_id and either id or content
  return !newRow.conversation_id || !newRow.id;
}

/**
 * Returns authentic WhatsApp Web status ticks and styling based on message wa_status.
 */
export function getWhatsAppStatusIcon(status?: string | null): {
  symbol: string;
  className: string;
  title: string;
} {
  switch (status) {
    case "read":
      return {
        symbol: "✓✓",
        className: "text-[var(--ticks-read)] font-bold text-[11px]",
        title: "Read",
      };
    case "delivered":
      return {
        symbol: "✓✓",
        className: "text-[var(--bubble-time)] font-bold text-[11px]",
        title: "Delivered",
      };
    case "failed":
      return {
        symbol: "!",
        className: "text-red-500 font-bold text-[11px]",
        title: "Failed to deliver",
      };
    case "sent":
    default:
      return {
        symbol: "✓",
        className: "text-[var(--bubble-time)] font-bold text-[11px]",
        title: "Sent",
      };
  }
}
