import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import {
  extractInboundContent,
  extractEchoContent,
  normalizePhoneNumber,
  isEchoChange,
  isIncomingMessageChange,
  parseMetaTimestamp,
} from "@/lib/webhook-parser";
import { verifyMetaSignature } from "@/lib/webhook-signature";

// Mock external dependencies for route testing
const mockSendWhatsAppMessage = vi.fn().mockResolvedValue({ success: true });
const mockGetAIResponse = vi.fn().mockResolvedValue("Hello! We are here to help.");

vi.mock("@/lib/whatsapp", () => ({
  sendWhatsAppMessage: (...args: any[]) => mockSendWhatsAppMessage(...args),
}));

vi.mock("@/lib/ai", () => ({
  getAIResponse: (...args: any[]) => mockGetAIResponse(...args),
}));

const TEST_SECRET = "test_meta_webhook_secret_12345";
vi.mock("@/lib/env", () => ({
  getRequiredEnv: (key: string) => {
    if (key === "WHATSAPP_APP_SECRET") return TEST_SECRET;
    return "test_val";
  },
}));

// In-memory mock database store for conversations and messages
interface MockConvo {
  id: string;
  phone: string;
  name: string | null;
  mode: "agent" | "human";
  needs_human: boolean;
  updated_at: string;
  last_customer_message_at?: string;
  last_agent_message_at?: string;
}

interface MockMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  direction: "in" | "out";
  whatsapp_type: string;
  content: string;
  whatsapp_msg_id: string;
  ai_reply_sent: boolean;
  created_at: string;
}

let mockConversations: MockConvo[] = [];
let mockMessages: MockMessage[] = [];

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      from: (table: string) => {
        if (table === "conversations") {
          return {
            select: () => ({
              eq: (col: string, val: any) => ({
                single: async () => {
                  const found = mockConversations.find((c) => (c as any)[col] === val);
                  return { data: found || null, error: found ? null : { message: "Not found" } };
                },
              }),
            }),
            insert: (data: Partial<MockConvo>) => ({
              select: () => ({
                single: async () => {
                  const newRow: MockConvo = {
                    id: `convo_${Date.now()}_${Math.random()}`,
                    phone: data.phone || "",
                    name: data.name || null,
                    mode: data.mode || "agent",
                    needs_human: Boolean(data.needs_human),
                    updated_at: data.updated_at || new Date().toISOString(),
                    last_customer_message_at: data.last_customer_message_at,
                    last_agent_message_at: data.last_agent_message_at,
                  };
                  mockConversations.push(newRow);
                  return { data: newRow, error: null };
                },
              }),
            }),
            update: (updates: Partial<MockConvo>) => ({
              eq: (col: string, val: any) => {
                const target = mockConversations.find((c) => (c as any)[col] === val);
                if (target) Object.assign(target, updates);
                return Promise.resolve({ error: null });
              },
            }),
          };
        }

        if (table === "messages") {
          return {
            select: () => ({
              eq: (col: string, val: any) => ({
                maybeSingle: async () => {
                  const found = mockMessages.find((m) => (m as any)[col] === val);
                  return { data: found || null, error: null };
                },
                single: async () => {
                  const found = mockMessages.find((m) => (m as any)[col] === val);
                  return { data: found || null, error: found ? null : { message: "Not found" } };
                },
                order: () => ({
                  limit: async () => ({
                    data: mockMessages
                      .filter((m) => (m as any)[col] === val)
                      .map((m) => ({ role: m.role, content: m.content })),
                  }),
                }),
              }),
            }),
            insert: (data: Partial<MockMessage>) => {
              const newRow: MockMessage = {
                id: `msg_${Date.now()}_${Math.random()}`,
                conversation_id: data.conversation_id || "",
                role: data.role || "user",
                direction: data.direction || "in",
                whatsapp_type: data.whatsapp_type || "text",
                content: data.content || "",
                whatsapp_msg_id: data.whatsapp_msg_id || "",
                ai_reply_sent: Boolean(data.ai_reply_sent),
                created_at: data.created_at || new Date().toISOString(),
              };
              mockMessages.push(newRow);
              return {
                select: () => ({
                  single: async () => ({ data: newRow, error: null }),
                }),
              };
            },
            update: (updates: Partial<MockMessage>) => ({
              eq: (col: string, val: any) => {
                const target = mockMessages.find((m) => (m as any)[col] === val);
                if (target) Object.assign(target, updates);
                return Promise.resolve({ error: null });
              },
            }),
          };
        }

        return {};
      },
    },
  };
});

// Import POST handler after mocks are configured
import { POST, clearInFlightMessages, setInFlightMessageForTest } from "@/app/api/webhook/route";

function createSignedRequest(payload: object, secret: string = TEST_SECRET): NextRequest {
  const rawBody = JSON.stringify(payload);
  const signature = "sha256=" + createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return new NextRequest("http://localhost:3000/api/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hub-signature-256": signature,
    },
    body: rawBody,
  });
}

describe("WhatsApp Coexistence & Webhook Synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearInFlightMessages();
    mockConversations = [];
    mockMessages = [];
  });

  describe("Parser Utilities (src/lib/webhook-parser.ts)", () => {
    it("normalizes phone numbers by stripping leading + and spaces", () => {
      expect(normalizePhoneNumber("+94 77 123 4567")).toBe("94771234567");
      expect(normalizePhoneNumber("+16505551234")).toBe("16505551234");
      expect(normalizePhoneNumber("94771234567")).toBe("94771234567");
    });

    it("correctly identifies echo events vs normal message events", () => {
      expect(isEchoChange({ field: "smb_message_echoes", value: {} })).toBe(true);
      expect(isEchoChange({ field: "messages", value: { message_echoes: [{ id: "1" }] } })).toBe(true);
      expect(isEchoChange({ field: "messages", value: { messages: [{ id: "1" }] } })).toBe(false);

      expect(isIncomingMessageChange({ field: "messages", value: { messages: [{ id: "1" }] } })).toBe(true);
      expect(isIncomingMessageChange({ field: "smb_message_echoes", value: {} })).toBe(false);
    });

    it("extracts non-text message placeholders with truthful descriptions", () => {
      expect(extractInboundContent({ type: "image", image: { caption: "My current logo" } })).toEqual({
        text: "[Image: My current logo]",
        whatsappType: "image",
      });
      expect(extractInboundContent({ type: "image", image: {} })).toEqual({
        text: "[Image]",
        whatsappType: "image",
      });
      expect(extractInboundContent({ type: "audio", audio: { voice: true } })).toEqual({
        text: "[Voice Note]",
        whatsappType: "audio",
      });
      expect(extractInboundContent({ type: "document", document: { filename: "brief.pdf" } })).toEqual({
        text: "[Document: brief.pdf]",
        whatsappType: "document",
      });
      expect(extractInboundContent({ type: "location", location: { name: "Colombo Office" } })).toEqual({
        text: "[Location: Colombo Office]",
        whatsappType: "location",
      });
      expect(extractInboundContent({ type: "sticker" })).toEqual({
        text: "[Sticker]",
        whatsappType: "sticker",
      });
    });

    it("converts timestamps safely", () => {
      const epochSeconds = 1749416383;
      const parsed = parseMetaTimestamp(epochSeconds);
      expect(new Date(parsed).getTime()).toBe(epochSeconds * 1000);
    });
  });

  describe("HMAC-SHA256 Signature Security", () => {
    it("rejects requests with invalid or tampered signatures", async () => {
      const req = new NextRequest("http://localhost:3000/api/webhook", {
        method: "POST",
        headers: {
          "x-hub-signature-256": "sha256=invalid_hex_signature",
        },
        body: JSON.stringify({ object: "whatsapp_business_account" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("accepts requests with authentic HMAC-SHA256 signatures", async () => {
      const payload = { object: "whatsapp_business_account", entry: [] };
      const req = createSignedRequest(payload);
      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  describe("SMB Message Echoes (Messages Sent from WhatsApp Business App)", () => {
    it("persists app-originated outgoing message and switches conversation to Human mode", async () => {
      const customerPhone = "94743274115";
      const echoId = "wamid.echo_test_001";
      const echoPayload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "WABA_ID",
            changes: [
              {
                field: "smb_message_echoes",
                value: {
                  messaging_product: "whatsapp",
                  message_echoes: [
                    {
                      from: "15550783881",
                      to: customerPhone,
                      id: echoId,
                      timestamp: "1749416383",
                      type: "text",
                      text: { body: "Hey! I can give you a 15% discount on the Growth package." },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const res = await POST(createSignedRequest(echoPayload));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.status).toBe("echo_processed");

      // Verify conversation was created in Human mode
      const convo = mockConversations.find((c) => c.phone === customerPhone);
      expect(convo).toBeDefined();
      expect(convo?.mode).toBe("human");
      expect(convo?.needs_human).toBe(true);

      // Verify message was stored as an outgoing assistant message
      const savedMsg = mockMessages.find((m) => m.whatsapp_msg_id === echoId);
      expect(savedMsg).toBeDefined();
      expect(savedMsg?.role).toBe("assistant");
      expect(savedMsg?.direction).toBe("out");
      expect(savedMsg?.content).toBe("Hey! I can give you a 15% discount on the Growth package.");

      // CRITICAL ASSERTION: Echoes must NEVER trigger AI auto-replies or outbound messages
      expect(mockGetAIResponse).not.toHaveBeenCalled();
      expect(mockSendWhatsAppMessage).not.toHaveBeenCalled();
    });

    it("prevents duplicate echo insertion and does not overwrite subsequent mode changes", async () => {
      const customerPhone = "94743274115";
      const echoId = "wamid.echo_duplicate_001";

      // Pre-seed conversation in agent mode and message already stored
      mockConversations.push({
        id: "convo_1",
        phone: customerPhone,
        name: "Test Client",
        mode: "agent", // Staff deliberately toggled back to AI in dashboard
        needs_human: false,
        updated_at: new Date().toISOString(),
      });

      mockMessages.push({
        id: "msg_1",
        conversation_id: "convo_1",
        role: "assistant",
        direction: "out",
        whatsapp_type: "text",
        content: "Echo text",
        whatsapp_msg_id: echoId,
        ai_reply_sent: true,
        created_at: new Date().toISOString(),
      });

      const echoPayload = {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "smb_message_echoes",
                value: {
                  message_echoes: [
                    {
                      from: "15550783881",
                      to: customerPhone,
                      id: echoId,
                      type: "text",
                      text: { body: "Echo text" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const res = await POST(createSignedRequest(echoPayload));
      const json = await res.json();

      expect(json.status).toBe("echo_duplicate");
      // Must NOT re-insert or toggle mode back to human
      expect(mockConversations[0].mode).toBe("agent");
      expect(mockMessages.length).toBe(1);
    });
  });

  describe("Inbound Customer Messages & Human Mode Pausing", () => {
    it("handles normal text message in Agent mode by invoking AI and sending WhatsApp reply", async () => {
      const customerPhone = "94711122334";
      const msgId = "wamid.inbound_001";

      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  contacts: [{ profile: { name: "Sarah" }, wa_id: customerPhone }],
                  messages: [
                    {
                      from: customerPhone,
                      id: msgId,
                      timestamp: "1749416000",
                      type: "text",
                      text: { body: "What are your website pricing options?" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const res = await POST(createSignedRequest(payload));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.status).toBe("replied");

      expect(mockGetAIResponse).toHaveBeenCalled();
      expect(mockSendWhatsAppMessage).toHaveBeenCalledWith(customerPhone, "Hello! We are here to help.");

      // Check stored user message and assistant reply
      expect(mockMessages.some((m) => m.whatsapp_msg_id === msgId && m.role === "user")).toBe(true);
      expect(mockMessages.some((m) => m.content === "Hello! We are here to help." && m.role === "assistant")).toBe(true);
    });

    it("pauses AI auto-reply when conversation is in Human mode (after phone app intervention)", async () => {
      const customerPhone = "94799988776";

      // Pre-seed conversation in Human mode (e.g., staff intervened from mobile app)
      mockConversations.push({
        id: "convo_human_1",
        phone: customerPhone,
        name: "VIP Customer",
        mode: "human",
        needs_human: true,
        updated_at: new Date().toISOString(),
      });

      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  messages: [
                    {
                      from: customerPhone,
                      id: "wamid.inbound_human_001",
                      type: "text",
                      text: { body: "Can I pay via bank transfer?" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const res = await POST(createSignedRequest(payload));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.status).toBe("stored_for_human");

      // AI must NOT have been called
      expect(mockGetAIResponse).not.toHaveBeenCalled();
      expect(mockSendWhatsAppMessage).not.toHaveBeenCalled();

      // Customer message is preserved in DB for human to view on dashboard
      const stored = mockMessages.find((m) => m.whatsapp_msg_id === "wamid.inbound_human_001");
      expect(stored).toBeDefined();
      expect(stored?.content).toBe("Can I pay via bank transfer?");
      expect(stored?.role).toBe("user");
    });

    it("stores non-text inbound media with clear placeholder without failing", async () => {
      const customerPhone = "94755566778";
      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  messages: [
                    {
                      from: customerPhone,
                      id: "wamid.img_001",
                      type: "image",
                      image: { caption: "Here is our brand guide sketch", id: "meta_media_123" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const res = await POST(createSignedRequest(payload));
      expect(res.status).toBe(200);

      const savedImgMsg = mockMessages.find((m) => m.whatsapp_msg_id === "wamid.img_001");
      expect(savedImgMsg).toBeDefined();
      expect(savedImgMsg?.whatsapp_type).toBe("image");
      expect(savedImgMsg?.content).toBe("[Image: Here is our brand guide sketch]");
    });
  });

  describe("Delivery Statuses & Unsupported Events", () => {
    it("handles delivery status receipts cleanly without error", async () => {
      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  statuses: [
                    {
                      id: "wamid.sent_001",
                      status: "delivered",
                      recipient_id: "94743274115",
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const res = await POST(createSignedRequest(payload));
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.status).toBe("status_received");
    });

    it("ignores non-WhatsApp Business events safely", async () => {
      const payload = { object: "user", entry: [] };
      const res = await POST(createSignedRequest(payload));
      const json = await res.json();
      expect(json.status).toBe("ignored");
    });
  });

  describe("Duplicate Webhook Deliveries & Concurrent AI Response Prevention", () => {
    it("returns duplicate_already_replied and does not invoke AI when message was already answered", async () => {
      const customerPhone = "94770001122";
      const msgId = "wamid.dup_answered_001";

      mockConversations.push({
        id: "convo_dup_1",
        phone: customerPhone,
        name: "Test Customer",
        mode: "agent",
        needs_human: false,
        updated_at: new Date().toISOString(),
      });

      mockMessages.push({
        id: "msg_dup_1",
        conversation_id: "convo_dup_1",
        role: "user",
        direction: "in",
        whatsapp_type: "text",
        content: "Hello again",
        whatsapp_msg_id: msgId,
        ai_reply_sent: true,
        created_at: new Date().toISOString(),
      });

      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  messages: [
                    {
                      from: customerPhone,
                      id: msgId,
                      timestamp: "1749416000",
                      type: "text",
                      text: { body: "Hello again" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const res = await POST(createSignedRequest(payload));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.status).toBe("duplicate_already_replied");
      expect(mockGetAIResponse).not.toHaveBeenCalled();
      expect(mockSendWhatsAppMessage).not.toHaveBeenCalled();
    });

    it("returns duplicate_in_progress and prevents duplicate concurrent AI response when message is already stored recently (< 60 seconds)", async () => {
      const customerPhone = "94770001122";
      const msgId = "wamid.dup_inflight_001";

      mockConversations.push({
        id: "convo_dup_2",
        phone: customerPhone,
        name: "Test Customer",
        mode: "agent",
        needs_human: false,
        updated_at: new Date().toISOString(),
      });

      // Message already stored from first delivery 10 seconds ago, ai_reply_sent is false
      mockMessages.push({
        id: "msg_dup_2",
        conversation_id: "convo_dup_2",
        role: "user",
        direction: "in",
        whatsapp_type: "text",
        content: "What are your services?",
        whatsapp_msg_id: msgId,
        ai_reply_sent: false,
        created_at: new Date(Date.now() - 10_000).toISOString(),
      });

      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  messages: [
                    {
                      from: customerPhone,
                      id: msgId,
                      timestamp: "1749416000",
                      type: "text",
                      text: { body: "What are your services?" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const res = await POST(createSignedRequest(payload));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.status).toBe("duplicate_in_progress");
      expect(mockGetAIResponse).not.toHaveBeenCalled();
      expect(mockSendWhatsAppMessage).not.toHaveBeenCalled();
    });

    it("returns duplicate_in_progress immediately when message is currently in-flight in memory", async () => {
      const customerPhone = "94770005566";
      const msgId = "wamid.inflight_mem_001";

      setInFlightMessageForTest(msgId);

      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  messages: [
                    {
                      from: customerPhone,
                      id: msgId,
                      timestamp: "1749416000",
                      type: "text",
                      text: { body: "Burst message" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const res = await POST(createSignedRequest(payload));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.status).toBe("duplicate_in_progress");
      expect(mockGetAIResponse).not.toHaveBeenCalled();
      expect(mockSendWhatsAppMessage).not.toHaveBeenCalled();
    });

    it("allows safe retry of stale un-replied message (> 60 seconds old) without creating duplicate customer message", async () => {
      const customerPhone = "94770003344";
      const msgId = "wamid.stale_retry_001";
      const convoId = "convo_stale_1";

      mockConversations.push({
        id: convoId,
        phone: customerPhone,
        name: "Stale Customer",
        mode: "agent",
        needs_human: false,
        updated_at: new Date(Date.now() - 120_000).toISOString(),
      });

      // Stored 90 seconds ago, initial AI call failed so ai_reply_sent is still false
      mockMessages.push({
        id: "msg_stale_1",
        conversation_id: convoId,
        role: "user",
        direction: "in",
        whatsapp_type: "text",
        content: "I need pricing details",
        whatsapp_msg_id: msgId,
        ai_reply_sent: false,
        created_at: new Date(Date.now() - 90_000).toISOString(),
      });

      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  messages: [
                    {
                      from: customerPhone,
                      id: msgId,
                      timestamp: String(Math.floor((Date.now() - 90_000) / 1000)),
                      type: "text",
                      text: { body: "I need pricing details" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const res = await POST(createSignedRequest(payload));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.status).toBe("replied");
      expect(mockGetAIResponse).toHaveBeenCalledTimes(1);
      expect(mockSendWhatsAppMessage).toHaveBeenCalledTimes(1);

      // Verify that NO duplicate customer message was inserted
      const customerMessages = mockMessages.filter(
        (m) => m.whatsapp_msg_id === msgId && m.direction === "in"
      );
      expect(customerMessages.length).toBe(1);
      expect(customerMessages[0].ai_reply_sent).toBe(true);

      // Verify assistant message was created
      const assistantMessages = mockMessages.filter(
        (m) => m.conversation_id === convoId && m.role === "assistant"
      );
      expect(assistantMessages.length).toBe(1);

      // Verify subsequent retry now immediately returns duplicate_already_replied
      const retryRes = await POST(createSignedRequest(payload));
      const retryJson = await retryRes.json();
      expect(retryRes.status).toBe(200);
      expect(retryJson.status).toBe("duplicate_already_replied");
      expect(mockGetAIResponse).toHaveBeenCalledTimes(1); // not called again
    });
  });
});
