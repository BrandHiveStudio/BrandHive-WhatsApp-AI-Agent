import BrandingClient from "./branding-client";

export const metadata = {
  title: "Branding & Logo Settings | BrandHive Studio Admin",
  description: "Configure BrandHive Studio logo and branding assets.",
};

export default function BrandingPage() {
  return <BrandingClient userEmail="staff@brandhive.io" />;
}
