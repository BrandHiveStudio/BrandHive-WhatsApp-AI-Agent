import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/conversations/[id]/send/route";

// Mock dependencies
const mockSendWhatsAppMessage = vi.fn();
vi.mock("@/lib/whatsapp", () => ({
  sendWhatsAppMessage: (...args: any[]) => mockSendWhatsAppMessage(...args),
}));

vi.mock("@/lib/auth", () => ({
  requireStaffUser: vi.fn().mockResolvedValue({
    user: { id: "staff-uuid-1", email: "staff@brandhive.io" },
  }),
}));

let mockConversation: { id: string; phone: string } | null = {
  id: "convo-123",
  phone: "94771234567",
};

let insertedMessages: any[] = [];
let updatedConversations: any[] = [];

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "conversations") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: mockConversation,
                error: mockConversation ? null : { message: "Not found" },
              }),
            }),
          }),
          update: (updates: any) => ({
            eq: () => {
              updatedConversations.push(updates);
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      if (table === "messages") {
        return {
          insert: (record: any) => ({
            select: () => ({
              single: async () => {
                insertedMessages.push(record);
                return {
                  data: { id: "msg-db-uuid", ...record, created_at: new Date().toISOString() },
                  error: null,
                };
              },
            }),
          }),
        };
      }
      return {};
    },
  },
}));

describe("Manual Send API Route (Task 13 Section 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedMessages = [];
    updatedConversations = [];
    mockConversation = { id: "convo-123", phone: "94771234567" };
  });

  it("persists WhatsApp message ID, direction 'out', and ai_reply_sent: false on successful send", async () => {
    mockSendWhatsAppMessage.mockResolvedValueOnce({
      messaging_product: "whatsapp",
      contacts: [{ input: "94771234567", wa_id: "94771234567" }],
      messages: [{ id: "wamid.HBgLOTQ3NzEyMzQ1NjcVAgASGBYzRUIwMTIzNDU2" }],
    });

    const request = new NextRequest("http://localhost:3000/api/conversations/convo-123/send", {
      method: "POST",
      body: JSON.stringify({ message: "Hello from BrandHive staff!" }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "convo-123" }) });
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.whatsapp_msg_id).toBe("wamid.HBgLOTQ3NzEyMzQ1NjcVAgASGBYzRUIwMTIzNDU2");
    expect(json.direction).toBe("out");
    expect(json.role).toBe("assistant");
    expect(json.ai_reply_sent).toBe(false);

    // Database record was inserted
    expect(insertedMessages.length).toBe(1);
    expect(insertedMessages[0].whatsapp_msg_id).toBe("wamid.HBgLOTQ3NzEyMzQ1NjcVAgASGBYzRUIwMTIzNDU2");
    expect(insertedMessages[0].direction).toBe("out");
  });

  it("does NOT insert a database message record when Meta WhatsApp rejects the message", async () => {
    // Meta error response (e.g. 24-hour customer window expired)
    mockSendWhatsAppMessage.mockResolvedValueOnce({
      error: {
        message: "(#131047) Message failed to send because more than 24 hours have passed since the customer last replied.",
        type: "OAuthException",
        code: 131047,
      },
    });

    const request = new NextRequest("http://localhost:3000/api/conversations/convo-123/send", {
      method: "POST",
      body: JSON.stringify({ message: "This message will be rejected by Meta" }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "convo-123" }) });
    expect(response.status).toBe(502);

    const json = await response.json();
    expect(json.error).toContain("WhatsApp delivery failed");
    expect(json.error).toContain("131047");

    // CRITICAL: No phantom message was inserted into the database!
    expect(insertedMessages.length).toBe(0);
    expect(updatedConversations.length).toBe(0);
  });

  it("does NOT insert a record if WhatsApp API throws a network/fetch exception", async () => {
    mockSendWhatsAppMessage.mockRejectedValueOnce(new Error("Connection timeout to graph.facebook.com"));

    const request = new NextRequest("http://localhost:3000/api/conversations/convo-123/send", {
      method: "POST",
      body: JSON.stringify({ message: "Network test" }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "convo-123" }) });
    expect(response.status).toBe(502);

    const json = await response.json();
    expect(json.error).toContain("Failed to connect to WhatsApp Cloud API");

    // No message inserted
    expect(insertedMessages.length).toBe(0);
  });

  it("does NOT insert a record if Meta returns an empty or invalid messages array", async () => {
    mockSendWhatsAppMessage.mockResolvedValueOnce({
      messaging_product: "whatsapp",
      messages: [],
    });

    const request = new NextRequest("http://localhost:3000/api/conversations/convo-123/send", {
      method: "POST",
      body: JSON.stringify({ message: "Empty messages test" }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "convo-123" }) });
    expect(response.status).toBe(502);

    const json = await response.json();
    expect(json.error).toContain("No confirmation ID was returned");

    expect(insertedMessages.length).toBe(0);
  });

  it("rejects empty or whitespace-only messages without calling Meta or inserting to DB", async () => {
    const request = new NextRequest("http://localhost:3000/api/conversations/convo-123/send", {
      method: "POST",
      body: JSON.stringify({ message: "   " }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "convo-123" }) });
    expect(response.status).toBe(400);

    expect(mockSendWhatsAppMessage).not.toHaveBeenCalled();
    expect(insertedMessages.length).toBe(0);
  });
});
