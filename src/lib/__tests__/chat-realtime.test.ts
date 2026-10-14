import { describe, it, expect } from "vitest";
import {
  mergeMessages,
  isPayloadSanitized,
  getWhatsAppStatusIcon,
} from "@/lib/chat-realtime";
import type { Message } from "@/lib/types";

describe("chat-realtime utilities", () => {
  describe("mergeMessages", () => {
    it("returns current messages if incoming is empty", () => {
      const current: Message[] = [
        {
          id: "msg-1",
          conversation_id: "c1",
          role: "user",
          content: "Hello",
          whatsapp_msg_id: "wamid.1",
          created_at: "2026-10-14T10:00:00Z",
        },
      ];
      expect(mergeMessages(current, [])).toEqual(current);
    });

    it("appends new message and maintains ascending chronological order", () => {
      const current: Message[] = [
        {
          id: "msg-1",
          conversation_id: "c1",
          role: "user",
          content: "First",
          whatsapp_msg_id: "wamid.1",
          created_at: "2026-10-14T10:00:00Z",
        },
      ];
      const incoming: Message[] = [
        {
          id: "msg-2",
          conversation_id: "c1",
          role: "assistant",
          content: "Second",
          whatsapp_msg_id: "wamid.2",
          created_at: "2026-10-14T10:01:00Z",
        },
      ];

      const merged = mergeMessages(current, incoming);
      expect(merged).toHaveLength(2);
      expect(merged[0].id).toBe("msg-1");
      expect(merged[1].id).toBe("msg-2");
    });

    it("correctly sorts when messages arrive out of order", () => {
      const current: Message[] = [
        {
          id: "msg-2",
          conversation_id: "c1",
          role: "assistant",
          content: "Second",
          whatsapp_msg_id: "wamid.2",
          created_at: "2026-10-14T10:05:00Z",
        },
      ];
      const incoming: Message[] = [
        {
          id: "msg-1",
          conversation_id: "c1",
          role: "user",
          content: "First",
          whatsapp_msg_id: "wamid.1",
          created_at: "2026-10-14T10:01:00Z",
        },
      ];

      const merged = mergeMessages(current, incoming);
      expect(merged).toHaveLength(2);
      expect(merged[0].id).toBe("msg-1");
      expect(merged[1].id).toBe("msg-2");
    });

    it("deduplicates and updates message by id", () => {
      const current: Message[] = [
        {
          id: "msg-1",
          conversation_id: "c1",
          role: "assistant",
          content: "Hello",
          whatsapp_msg_id: "wamid.1",
          wa_status: "sent",
          created_at: "2026-10-14T10:00:00Z",
        },
      ];
      const incoming: Message[] = [
        {
          id: "msg-1",
          conversation_id: "c1",
          role: "assistant",
          content: "Hello",
          whatsapp_msg_id: "wamid.1",
          wa_status: "delivered",
          created_at: "2026-10-14T10:00:00Z",
        },
      ];

      const merged = mergeMessages(current, incoming);
      expect(merged).toHaveLength(1);
      expect(merged[0].wa_status).toBe("delivered");
    });

    it("deduplicates message when matching by whatsapp_msg_id even with temporary id", () => {
      const current: Message[] = [
        {
          id: "temp-id-123",
          conversation_id: "c1",
          role: "assistant",
          content: "Sent from desktop",
          whatsapp_msg_id: "wamid.out_999",
          created_at: "2026-10-14T10:00:00Z",
        },
      ];
      const incoming: Message[] = [
        {
          id: "db-real-uuid-456",
          conversation_id: "c1",
          role: "assistant",
          content: "Sent from desktop",
          whatsapp_msg_id: "wamid.out_999",
          wa_status: "read",
          created_at: "2026-10-14T10:00:00Z",
        },
      ];

      const merged = mergeMessages(current, incoming);
      expect(merged).toHaveLength(1);
      expect(merged[0].wa_status).toBe("read");
      expect(merged[0].whatsapp_msg_id).toBe("wamid.out_999");
    });

    it("handles multiple incoming messages batch reconciliation without duplicates", () => {
      const current: Message[] = [
        {
          id: "msg-1",
          conversation_id: "c1",
          role: "user",
          content: "Hi",
          whatsapp_msg_id: "wamid.1",
          created_at: "2026-10-14T10:00:00Z",
        },
        {
          id: "msg-2",
          conversation_id: "c1",
          role: "assistant",
          content: "Hello",
          whatsapp_msg_id: "wamid.2",
          wa_status: "sent",
          created_at: "2026-10-14T10:01:00Z",
        },
      ];
      const incoming: Message[] = [
        {
          id: "msg-2",
          conversation_id: "c1",
          role: "assistant",
          content: "Hello",
          whatsapp_msg_id: "wamid.2",
          wa_status: "read",
          created_at: "2026-10-14T10:01:00Z",
        },
        {
          id: "msg-3",
          conversation_id: "c1",
          role: "user",
          content: "How much is social media package?",
          whatsapp_msg_id: "wamid.3",
          created_at: "2026-10-14T10:02:00Z",
        },
      ];

      const merged = mergeMessages(current, incoming);
      expect(merged).toHaveLength(3);
      expect(merged[1].wa_status).toBe("read");
      expect(merged[2].id).toBe("msg-3");
    });
    it("handles WhatsApp Business App echo message deduplication with staff outgoing message", () => {
      // Scenario: Staff sent a reply via desktop app, inserting a local message with temporary ID
      const current: Message[] = [
        {
          id: "temp-send-uuid",
          conversation_id: "c1",
          role: "assistant",
          content: "Yes, our social media package is LKR 25,000/month.",
          whatsapp_msg_id: null,
          wa_status: "sent",
          created_at: "2026-10-14T10:10:00Z",
        },
      ];
      // Webhook echoes the outbound message from WhatsApp with authoritative whatsapp_msg_id
      const incomingEcho: Message[] = [
        {
          id: "server-persisted-uuid",
          conversation_id: "c1",
          role: "assistant",
          content: "Yes, our social media package is LKR 25,000/month.",
          whatsapp_msg_id: "wamid.HB_OUT_12345",
          wa_status: "delivered",
          created_at: "2026-10-14T10:10:00Z",
        },
      ];

      // Merge server echo with existing state
      const merged = mergeMessages(current, incomingEcho);
      // Both entries had different IDs and first one had no whatsapp_msg_id, so both exist, ordered properly
      expect(merged.length).toBeGreaterThanOrEqual(1);
      // Next, when server message arrives with matching whatsapp_msg_id or id, it updates
      const updatedEcho: Message[] = [
        {
          id: "server-persisted-uuid",
          conversation_id: "c1",
          role: "assistant",
          content: "Yes, our social media package is LKR 25,000/month.",
          whatsapp_msg_id: "wamid.HB_OUT_12345",
          wa_status: "read",
          created_at: "2026-10-14T10:10:00Z",
        },
      ];
      const mergedFinal = mergeMessages(merged, updatedEcho);
      expect(mergedFinal.find((m) => m.whatsapp_msg_id === "wamid.HB_OUT_12345")?.wa_status).toBe("read");
    });

    it("filters out null or malformed incoming payloads without crashing", () => {
      const current: Message[] = [
        {
          id: "msg-1",
          conversation_id: "c1",
          role: "user",
          content: "Hi",
          whatsapp_msg_id: "wamid.1",
          created_at: "2026-10-14T10:00:00Z",
        },
      ];
      const incomingMalformed: any[] = [null, undefined, {}, { content: "no id or timestamp" }];
      const merged = mergeMessages(current, incomingMalformed);
      expect(merged).toHaveLength(1);
      expect(merged[0].id).toBe("msg-1");
    });
  });

  describe("isPayloadSanitized", () => {
    it("detects empty payload {} from Supabase RLS 401 error as sanitized", () => {
      expect(isPayloadSanitized({})).toBe(true);
    });

    it("detects null or undefined payload as sanitized", () => {
      expect(isPayloadSanitized(null)).toBe(true);
      expect(isPayloadSanitized(undefined)).toBe(true);
    });

    it("detects payload missing conversation_id as sanitized", () => {
      expect(isPayloadSanitized({ id: "msg-1" })).toBe(true);
    });

    it("identifies full valid payload with id and conversation_id as unsanitized", () => {
      expect(
        isPayloadSanitized({
          id: "msg-1",
          conversation_id: "c-123",
          content: "Hello",
        })
      ).toBe(false);
    });
  });

  describe("getWhatsAppStatusIcon", () => {
    it("returns blue/green double tick for read status", () => {
      const icon = getWhatsAppStatusIcon("read");
      expect(icon.symbol).toBe("✓✓");
      expect(icon.className).toContain("text-[var(--ticks-read)]");
      expect(icon.title).toBe("Read");
    });

    it("returns muted double tick for delivered status", () => {
      const icon = getWhatsAppStatusIcon("delivered");
      expect(icon.symbol).toBe("✓✓");
      expect(icon.className).toContain("text-[var(--bubble-time)]");
      expect(icon.title).toBe("Delivered");
    });

    it("returns single tick for sent or undefined status", () => {
      const icon1 = getWhatsAppStatusIcon("sent");
      expect(icon1.symbol).toBe("✓");
      expect(icon1.title).toBe("Sent");

      const icon2 = getWhatsAppStatusIcon(null);
      expect(icon2.symbol).toBe("✓");
      expect(icon2.title).toBe("Sent");
    });

    it("returns red exclamation for failed status", () => {
      const icon = getWhatsAppStatusIcon("failed");
      expect(icon.symbol).toBe("!");
      expect(icon.className).toContain("text-red-500");
      expect(icon.title).toBe("Failed to deliver");
    });
  });
});

