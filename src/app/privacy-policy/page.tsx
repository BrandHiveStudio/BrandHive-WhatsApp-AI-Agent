import type { Metadata } from "next";
import Link from "next/link";
import PolicyLayout from "@/components/policy-layout";

export const metadata: Metadata = {
  title: "Privacy Policy | BrandHive Studio WhatsApp AI Agent",
  description:
    "Official Privacy Policy for BrandHive Studio WhatsApp AI Agent, detailing data collection, processing, and privacy commitments.",
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout
      title="Privacy Policy"
      subtitle="How BrandHive Studio collects, uses, processes, and protects your information when interacting with our WhatsApp AI assistant and digital services."
      lastUpdated="September 2026"
      activePath="/privacy-policy"
    >
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">1. Introduction & Overview</h2>
        <p>
          BrandHive Studio (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) provides professional creative design,
          branding, website development, and digital marketing services in Sri Lanka. We operate an automated
          WhatsApp customer assistance service (the &quot;WhatsApp AI Agent&quot;) via our official business number{" "}
          <span className="font-mono text-emerald-400">+94 70 641 0093</span> and associated online interfaces.
        </p>
        <p>
          This Privacy Policy explains the categories of information we collect, the purposes for which we process
          that information, our use of trusted infrastructure partners, and your rights regarding your personal
          data.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">2. Distinction Between AI Assistant and Human Team</h2>
        <p>
          Our WhatsApp channel utilizes an automated artificial intelligence assistant to provide prompt answers
          to general inquiries, share catalog service details, and assist with initial project scoping.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-white/70">
          <li>
            <strong className="text-white">Human Team Support Hours:</strong> Monday–Saturday, 9:00 AM – 6:00 PM
            (Asia/Colombo timezone, UTC+5:30). We are closed on Sundays.
          </li>
          <li>
            <strong className="text-white">After-Hours Operation:</strong> While the automated AI assistant may
            remain active outside normal working hours to help with basic information, human team members are not
            available 24/7, and messages are not monitored in real time around the clock.
          </li>
          <li>
            <strong className="text-white">Human Consultation:</strong> Any request requiring custom pricing,
            formal contracts, binding commitments, or complex creative planning is routed to the BrandHive Studio
            Client Relations Team during normal business hours.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">3. Information We Collect</h2>
        <p>
          When you communicate with BrandHive Studio through WhatsApp, we process only the information necessary
          to handle your inquiry and provide our services:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-white/70">
          <li>
            <strong className="text-white">Contact & Identity Information:</strong> Your WhatsApp phone number and
            your WhatsApp profile display name, as transmitted by the WhatsApp platform.
          </li>
          <li>
            <strong className="text-white">Message & Project Information:</strong> Text messages, service queries,
            project descriptions, design preferences, and requirements you choose to share with us.
          </li>
          <li>
            <strong className="text-white">Operational & Technical Telemetry:</strong> Inbound message timestamps,
            message delivery IDs, and coarse language context (e.g. English, Sinhala, or Tamil script) necessary
            to respond appropriately and avoid duplicate message processing.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">4. Purposes of Data Processing</h2>
        <p>We process the collected information for specific, legitimate business purposes:</p>
        <ul className="list-disc pl-5 space-y-1 text-white/70">
          <li>Responding to your customer service inquiries and technical questions.</li>
          <li>
            Providing information on BrandHive Studio services, packages (e.g., Logo Design, Branding Packages,
            Websites), and standard add-ons.
          </li>
          <li>Understanding your project scope and preparing preliminary recommendations.</li>
          <li>Qualifying sales leads and facilitating human handoff to our Client Relations Team.</li>
          <li>Operating, maintaining, and improving the reliability of the automated assistant.</li>
        </ul>
        <p className="text-xs text-white/60">
          We do not sell, rent, lease, or monetize your personal information to third parties for advertising or
          unrelated commercial purposes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">5. Third-Party Infrastructure & Service Providers</h2>
        <p>
          To reliably deliver the WhatsApp AI Agent, data is processed through established cloud and technology
          providers acting under our technical configuration:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="font-medium text-white text-xs mb-1">Meta Platforms (WhatsApp Cloud API)</div>
            <div className="text-xs text-white/60">
              Facilitates secure transmission of messages between WhatsApp users and our application endpoint.
            </div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="font-medium text-white text-xs mb-1">Vercel Inc.</div>
            <div className="text-xs text-white/60">
              Provides the hosting environment and serverless execution for our application and webhook router.
            </div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="font-medium text-white text-xs mb-1">Supabase Inc.</div>
            <div className="text-xs text-white/60">
              Provides managed cloud database storage for conversation history, messages, and catalog knowledge.
            </div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="font-medium text-white text-xs mb-1">OpenRouter</div>
            <div className="text-xs text-white/60">
              Processes conversational inference based strictly on BrandHive&apos;s authoritative instructions and service catalog.
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">6. Data Retention & Deletion</h2>
        <p>
          Conversation records are retained in our database to maintain conversational context during active
          discussions and allow our Client Relations Team to review previous inquiries when continuing project
          consultations.
        </p>
        <p>
          You have the right to request the deletion of your personal data and conversation history at any time.
          For complete, step-by-step instructions on submitting a deletion request, please visit our dedicated{" "}
          <Link href="/data-deletion" className="text-emerald-400 underline hover:text-emerald-300">
            User Data Deletion Instructions
          </Link>{" "}
          page.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">7. Security Safeguards</h2>
        <p>
          We employ standard security best practices to protect your information, including HTTPS/TLS encryption
          for data in transit, cryptographic HMAC-SHA256 signature verification for inbound Meta webhook events,
          and role-based access controls for database access. While we take diligent precautions to safeguard data,
          no electronic transmission or digital storage method is completely infallible, and absolute security
          cannot be guaranteed.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">8. Policy Updates</h2>
        <p>
          We may update this Privacy Policy from time to time to reflect improvements in our systems or changes in
          operational practices. The &quot;Last Updated&quot; date at the top of this page indicates when the latest
          revisions took effect.
        </p>
      </section>
    </PolicyLayout>
  );
}
