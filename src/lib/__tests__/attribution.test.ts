import { describe, it, expect } from "vitest";
import { getMessageAttribution } from "@/lib/attribution";
import type { Message } from "@/lib/types";

describe("Message Attribution Classifier (Task 13)", () => {
  it("reliably classifies customer inbound messages", () => {
    const customerMsg: Partial<Message> = {
      id: "msg-1",
      role: "user",
      direction: "in",
      whatsapp_msg_id: "wamid.HBgLOTQ3MDM5MDU0NDEVAgASGBYzRUIwRDEwRDJGN0JGMjVCMzY2QjkyAA==",
      content: "Hello, how much is logo design?",
      ai_reply_sent: true,
    };

    const attribution = getMessageAttribution(customerMsg);
    expect(attribution.category).toBe("customer");
    expect(attribution.isHuman).toBe(true);
    expect(attribution.isReliable).toBe(true);
    expect(attribution.badgeStyle).toBe("none");
  });

  it("reliably classifies WhatsApp Business App messages from coexistence echoes", () => {
    const echoMsg: Partial<Message> = {
      id: "msg-2",
      role: "assistant",
      direction: "out",
      whatsapp_msg_id: "wamid.HBgLOTQ3MDM5MDU0NDEVAgASGBYzRUIwQjgxRDQwNEQwM0UwOUI0M0U4AA==",
      content: "Yes, our team can help you with that!",
      ai_reply_sent: true, // Verified SMB echo signature
    };

    const attribution = getMessageAttribution(echoMsg);
    expect(attribution.category).toBe("staff_wa_app");
    expect(attribution.badgeLabel).toBe("WhatsApp Business App");
    expect(attribution.badgeIcon).toBe("📱");
    expect(attribution.badgeStyle).toBe("coexistence");
    expect(attribution.isHuman).toBe(true);
    expect(attribution.isReliable).toBe(true);
  });

  it("reliably classifies Staff Dashboard messages when stored with outbound wamid and ai_reply_sent: false", () => {
    const dashboardMsg: Partial<Message> = {
      id: "msg-3",
      role: "assistant",
      direction: "out",
      whatsapp_msg_id: "wamid.HBgLOTQ3MDM5MDU0NDEVAgASGBYzRUIwRDEwRDJGN0JGMjVCMzY2QjkyAA==",
      content: "I have prepared the custom quote for your branding project.",
      ai_reply_sent: false,
    };

    const attribution = getMessageAttribution(dashboardMsg);
    expect(attribution.category).toBe("staff_dashboard");
    expect(attribution.badgeLabel).toBe("Staff (Dashboard)");
    expect(attribution.badgeIcon).toBe("👤");
    expect(attribution.badgeStyle).toBe("staff");
    expect(attribution.isHuman).toBe(true);
    expect(attribution.isReliable).toBe(true);
  });

  it("reliably uses explicit sender_type and sender_name when present", () => {
    const explicitMsg: Partial<Message> = {
      id: "msg-4",
      role: "assistant",
      sender_type: "staff_dashboard",
      sender_name: "priyantha@brandhive.io",
      content: "Checking on your invoice now.",
    };

    const attribution = getMessageAttribution(explicitMsg);
    expect(attribution.category).toBe("staff_dashboard");
    expect(attribution.badgeLabel).toBe("Staff: priyantha@brandhive.io");
    expect(attribution.authorName).toBe("priyantha@brandhive.io");
    expect(attribution.isHuman).toBe(true);
  });

  it("reliably classifies explicit AI-generated replies when sender_type is 'ai'", () => {
    const explicitAiMsg: Partial<Message> = {
      id: "msg-ai",
      role: "assistant",
      sender_type: "ai",
      content: "Our Logo Design package starts from LKR 8,000.",
    };

    const attribution = getMessageAttribution(explicitAiMsg);
    expect(attribution.category).toBe("ai");
    expect(attribution.badgeLabel).toBe("BrandHive AI");
    expect(attribution.badgeIcon).toBe("🤖");
    expect(attribution.badgeStyle).toBe("ai");
    expect(attribution.isHuman).toBe(false);
    expect(attribution.isReliable).toBe(true);
  });

  it("assigns neutral BrandHive Team attribution to assistant messages with direction: 'out' and no WhatsApp ID", () => {
    // Regression check: direction === 'out' without wamid must NOT be assumed to be AI
    const unconfirmedOutMsg: Partial<Message> = {
      id: "msg-5",
      role: "assistant",
      direction: "out",
      whatsapp_msg_id: null,
      content: "Our Logo Design package starts from LKR 8,000. Would you like to see examples?",
      ai_reply_sent: false,
    };

    const attribution = getMessageAttribution(unconfirmedOutMsg);
    expect(attribution.category).toBe("unattributed_outbound");
    expect(attribution.badgeLabel).toBe("BrandHive Team");
    expect(attribution.badgeIcon).toBe("🏢");
    expect(attribution.badgeStyle).toBe("neutral");
    expect(attribution.isHuman).toBeNull();
    expect(attribution.isReliable).toBe(false);
  });

  it("gracefully classifies legacy historical outbound messages as neutral BrandHive Team without guessing", () => {
    const legacyMsg: Partial<Message> = {
      id: "msg-6",
      role: "assistant",
      direction: null,
      whatsapp_msg_id: null,
      content: "Thank you for contacting BrandHive Studio.",
    };

    const attribution = getMessageAttribution(legacyMsg);
    expect(attribution.category).toBe("unattributed_outbound");
    expect(attribution.badgeLabel).toBe("BrandHive Team");
    expect(attribution.badgeIcon).toBe("🏢");
    expect(attribution.badgeStyle).toBe("neutral");
    expect(attribution.isHuman).toBeNull();
    expect(attribution.isReliable).toBe(false);
  });

  it("handles null or undefined messages safely", () => {
    const attribution = getMessageAttribution(null);
    expect(attribution.category).toBe("unattributed_outbound");
    expect(attribution.badgeLabel).toBe("BrandHive Team");
    expect(attribution.isReliable).toBe(false);
  });
});
