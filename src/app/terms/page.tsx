import type { Metadata } from "next";
import Link from "next/link";
import PolicyLayout from "@/components/policy-layout";

export const metadata: Metadata = {
  title: "Terms of Service | BrandHive Studio WhatsApp AI Agent",
  description:
    "Terms of Service governing interaction with the BrandHive Studio WhatsApp AI Agent and related creative services.",
};

export default function TermsOfServicePage() {
  return (
    <PolicyLayout
      title="Terms of Service"
      subtitle="Terms and conditions governing your use of the BrandHive Studio WhatsApp AI Agent and digital communication channels."
      lastUpdated="September 2026"
      activePath="/terms"
    >
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">1. Agreement to Terms</h2>
        <p>
          By communicating with the BrandHive Studio WhatsApp AI Agent via{" "}
          <span className="font-mono text-emerald-400">+94 70 641 0093</span> or interacting with our digital
          inquiry channels, you agree to be bound by these Terms of Service. If you do not agree to these terms,
          please refrain from using the automated WhatsApp service and contact our team directly via email at{" "}
          <a
            href="mailto:brandhive.studio.lk@gmail.com"
            className="text-white underline hover:text-emerald-400 font-mono"
          >
            brandhive.studio.lk@gmail.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">2. Scope of Services</h2>
        <p>
          BrandHive Studio offers professional creative services including brand identity development, logo design,
          website design and development, social media creative packages, and digital marketing assets.
        </p>
        <p>
          The WhatsApp AI Agent is an automated communication system deployed to assist visitors with general
          inquiries, explain available service packages, and facilitate initial project scoping.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">3. Automated AI Assistant & Non-Binding Inquiries</h2>
        <p>
          Responses provided by the WhatsApp AI Agent are for informational and discovery purposes only:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-white/70">
          <li>
            <strong className="text-white">Indicative & Baseline Pricing:</strong> Published catalog pricing
            (such as &quot;Starting from LKR 8,000&quot; for standard Logo Design) represents baseline service estimates.
            Final pricing for any custom project depends on confirmed deliverables, revision rounds, complexity, and
            project timelines.
          </li>
          <li>
            <strong className="text-white">No Automated Contracts:</strong> The AI assistant is not authorized to
            enter into binding contracts, grant unauthorized price discounts, or commit BrandHive Studio to project
            schedules without human review.
          </li>
          <li>
            <strong className="text-white">Formal Proposals:</strong> All binding proposals, agreements, custom
            milestones, and project contracts must be reviewed and formally confirmed by an authorized human
            representative of the BrandHive Studio Client Relations Team.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">4. Payment & Financial Verification</h2>
        <p>
          To ensure customer safety and protect financial integrity:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-white/70">
          <li>
            A customer&apos;s statement in chat that a payment has been made does not constitute official confirmation
            of payment.
          </li>
          <li>
            Official payment confirmation is issued solely upon verification by our finance and operations team and
            is accompanied by a formal BrandHive Studio invoice or receipt.
          </li>
          <li>
            Bank account details are never distributed through automated conversational chat. Legitimate payment
            instructions are provided exclusively on official invoices issued by authorized BrandHive staff.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">5. Acceptable Use Policy</h2>
        <p>You agree to use our WhatsApp messaging service responsibly. You shall not:</p>
        <ul className="list-disc pl-5 space-y-1 text-white/70">
          <li>Send threatening, defamatory, harassing, obscene, or unlawful communications.</li>
          <li>
            Attempt prompt injection, system prompt exfiltration, reverse-engineering, or adversarial manipulation
            of the AI assistant.
          </li>
          <li>Transmit unauthorized commercial solicitations, spam, chain letters, or automated bots.</li>
          <li>Interfere with or disrupt the operation of our servers, webhooks, or database infrastructure.</li>
        </ul>
        <p className="text-xs text-white/60">
          BrandHive Studio reserves the right to suspend or block communication from numbers that violate these
          standards.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">6. Human Support & Service Availability</h2>
        <p>
          Our human team operates during normal business hours: Monday–Saturday, 9:00 AM – 6:00 PM (Asia/Colombo).
          While we strive for high uptime for our automated services, we do not warrant that the WhatsApp AI
          assistant will be uninterrupted, error-free, or operational 24 hours a day, 7 days a week.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">7. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted under applicable law, BrandHive Studio shall not be liable for any
          indirect, incidental, special, or consequential damages resulting from the use of, or inability to use,
          the automated WhatsApp AI Agent or communication channels.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">8. Related Policies</h2>
        <p>
          Please review our{" "}
          <Link href="/privacy-policy" className="text-emerald-400 underline hover:text-emerald-300">
            Privacy Policy
          </Link>{" "}
          to understand how we manage data, and our{" "}
          <Link href="/data-deletion" className="text-emerald-400 underline hover:text-emerald-300">
            User Data Deletion Instructions
          </Link>{" "}
          to request data removal.
        </p>
      </section>
    </PolicyLayout>
  );
}
