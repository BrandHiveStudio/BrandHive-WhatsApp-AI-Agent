import { getRequiredEnv } from "@/lib/env";

export async function sendWhatsAppMessage(to: string, body: string) {
  const phoneNumberId = getRequiredEnv("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = getRequiredEnv("WHATSAPP_ACCESS_TOKEN");

  const res = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
  return res.json();
}
