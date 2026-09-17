import CoexistenceClient from "./coexistence-client";

export const metadata = {
  title: "WhatsApp Business App Coexistence | BrandHive Studio Admin",
  description:
    "Administrative portal for WhatsApp Business App + Cloud API coexistence onboarding.",
};

export default function CoexistencePage() {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID || "1395774185211806";
  const configId =
    process.env.NEXT_PUBLIC_META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID || "";

  return (
    <CoexistenceClient
      appId={appId}
      configId={configId}
      userEmail="staff@brandhive.io"
    />
  );
}
