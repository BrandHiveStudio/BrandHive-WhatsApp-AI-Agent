/**
 * Webhook parser utilities for Meta WhatsApp Business Cloud API & Coexistence events.
 */

export interface ParsedMessageContent {
  text: string;
  whatsappType: string;
}

/**
 * Extracts human-readable text and message type for inbound customer messages.
 * For non-text messages (images, audio, documents, videos, locations), generates
 * clear, truthful placeholders with any available filenames or captions without
 * claiming media has been downloaded.
 */
export function extractInboundContent(message: Record<string, any>): ParsedMessageContent {
  if (!message || typeof message !== "object") {
    return { text: "[Unknown message]", whatsappType: "unknown" };
  }

  const type = String(message.type || "unknown").toLowerCase();

  switch (type) {
    case "text":
      return {
        text: message.text?.body?.trim() || "",
        whatsappType: "text",
      };

    case "image": {
      const caption = message.image?.caption?.trim();
      return {
        text: caption ? `[Image: ${caption}]` : "[Image]",
        whatsappType: "image",
      };
    }

    case "audio": {
      const isVoice = Boolean(message.audio?.voice);
      return {
        text: isVoice ? "[Voice Note]" : "[Audio]",
        whatsappType: "audio",
      };
    }

    case "video": {
      const caption = message.video?.caption?.trim();
      return {
        text: caption ? `[Video: ${caption}]` : "[Video]",
        whatsappType: "video",
      };
    }

    case "document": {
      const filename = message.document?.filename?.trim();
      const caption = message.document?.caption?.trim();
      const desc = filename || caption;
      return {
        text: desc ? `[Document: ${desc}]` : "[Document]",
        whatsappType: "document",
      };
    }

    case "location": {
      const loc = message.location;
      const details =
        loc?.name?.trim() ||
        loc?.address?.trim() ||
        (loc?.latitude && loc?.longitude ? `${loc.latitude}, ${loc.longitude}` : "");
      return {
        text: details ? `[Location: ${details}]` : "[Location]",
        whatsappType: "location",
      };
    }

    case "contacts":
      return {
        text: "[Contact Card]",
        whatsappType: "contacts",
      };

    case "sticker":
      return {
        text: "[Sticker]",
        whatsappType: "sticker",
      };

    case "interactive": {
      const reply = message.interactive?.button_reply || message.interactive?.list_reply;
      const title = reply?.title || reply?.id;
      return {
        text: title ? `[Reply: ${title}]` : "[Interactive Reply]",
        whatsappType: "interactive",
      };
    }

    default:
      return {
        text: `[${message.type || "Unsupported message"}]`,
        whatsappType: message.type || "unknown",
      };
  }
}

/**
 * Extracts outgoing message text and type from an SMB message echo (sent from the
 * physical WhatsApp Business app or linked devices in Coexistence mode).
 */
export function extractEchoContent(echo: Record<string, any>): ParsedMessageContent {
  if (!echo || typeof echo !== "object") {
    return { text: "[App message]", whatsappType: "text" };
  }

  // Echoes follow the same payload structure as messages
  return extractInboundContent(echo);
}

/**
 * Converts a Meta webhook Unix timestamp (in seconds or ms) into an ISO 8601 string.
 */
export function parseMetaTimestamp(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  const num = typeof ts === "string" ? Number.parseInt(ts, 10) : Number(ts);
  if (Number.isNaN(num) || num <= 0) return new Date().toISOString();
  const ms = num < 10000000000 ? num * 1000 : num;
  return new Date(ms).toISOString();
}

/**
 * Normalizes phone numbers to standard E.164 digits without leading '+'.
 */
export function normalizePhoneNumber(phone: unknown): string {
  if (!phone) return "";
  return String(phone).replace(/^\+/, "").replace(/\s+/g, "").trim();
}

/**
 * Checks whether a webhook change object represents an SMB message echo.
 */
export function isEchoChange(change: Record<string, any>): boolean {
  if (!change || typeof change !== "object") return false;
  const field = String(change.field || "");
  if (field === "smb_message_echoes" || field === "message_echoes") {
    return true;
  }
  const value = change.value;
  return Boolean(value && Array.isArray(value.message_echoes) && value.message_echoes.length > 0);
}

/**
 * Checks whether a webhook change object represents standard inbound customer messages.
 */
export function isIncomingMessageChange(change: Record<string, any>): boolean {
  if (!change || typeof change !== "object") return false;
  const field = String(change.field || "");
  if (field === "messages") {
    const value = change.value;
    return Boolean(value && Array.isArray(value.messages) && value.messages.length > 0);
  }
  return false;
}
