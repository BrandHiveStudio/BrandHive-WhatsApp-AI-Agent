import type { Metadata } from "next";
import Link from "next/link";
import PolicyLayout from "@/components/policy-layout";

export const metadata: Metadata = {
  title: "User Data Deletion Instructions | BrandHive Studio WhatsApp AI Agent",
  description:
    "Clear, practical instructions for requesting deletion of conversation records and personal data held by BrandHive Studio.",
};

export default function DataDeletionPage() {
  return (
    <PolicyLayout
      title="User Data Deletion Instructions"
      subtitle="How to request the complete deletion of your personal information and WhatsApp conversation records held by BrandHive Studio."
      lastUpdated="September 2026"
      activePath="/data-deletion"
    >
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">1. Overview of Your Deletion Rights</h2>
        <p>
          BrandHive Studio respects your right to control your personal data. If you have interacted with our
          WhatsApp AI Agent (<span className="font-mono text-emerald-400">+94 70 641 0093</span>) and would like your
          contact details, conversation history, or associated records removed from our systems, we provide a
          straightforward deletion process described below.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">2. Transparent Request-Based Process</h2>
        <p>
          Our application does not offer an automated self-service deletion trigger within the WhatsApp chat
          interface itself. To ensure accurate verification and prevent accidental deletion of ongoing client
          inquiries, all data deletion requests are processed directly by the BrandHive Studio Client Relations Team.
        </p>
        <p className="text-xs text-white/60">
          There are no fees associated with submitting a data deletion request.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">3. How to Submit a Deletion Request (Step-by-Step)</h2>
        <div className="space-y-4 my-4">
          <div className="rounded-xl border border-white/[0.08] bg-[#141414] p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                1
              </span>
              <h3 className="text-sm font-semibold text-white">Choose Your Contact Method</h3>
            </div>
            <p className="text-xs text-white/70 mb-3">
              You may submit your deletion request through either of our official channels:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-white/70">
              <li>
                <strong className="text-white">Email (Recommended):</strong> Send an email to{" "}
                <a
                  href="mailto:brandhive.studio.lk@gmail.com"
                  className="text-white underline hover:text-emerald-400 font-mono"
                >
                  brandhive.studio.lk@gmail.com
                </a>{" "}
                with the subject line:{" "}
                <span className="font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-white/90">
                  Data Deletion Request - WhatsApp AI Agent
                </span>
              </li>
              <li>
                <strong className="text-white">WhatsApp:</strong> Send a direct message to{" "}
                <span className="font-mono text-emerald-400">+94 70 641 0093</span> explicitly stating:{" "}
                <span className="italic text-white/90">&quot;Please delete my conversation history and personal data.&quot;</span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#141414] p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                2
              </span>
              <h3 className="text-sm font-semibold text-white">Provide Verification Details</h3>
            </div>
            <p className="text-xs text-white/70 mb-2">
              To ensure our team locates and deletes the exact records belonging to you, please include:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-white/70">
              <li>Your WhatsApp phone number in full international format (e.g., <span className="font-mono">+94 7X XXX XXXX</span>).</li>
              <li>Your WhatsApp display name / profile name, if known.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#141414] p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                3
              </span>
              <h3 className="text-sm font-semibold text-white">Deletion Execution & Confirmation</h3>
            </div>
            <p className="text-xs text-white/70 mb-2">
              Once verified, our team will:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-white/70">
              <li>Locate your record in our cloud database (matching your phone number across conversations and messages).</li>
              <li>Permanently purge all associated message entries, timestamps, and conversation records.</li>
              <li>Send you written confirmation via email or WhatsApp confirming that deletion has been completed.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">4. Processing Timeframe</h2>
        <p>
          Data deletion requests are reviewed and fulfilled by the BrandHive Studio Client Relations Team during
          regular business hours (Monday–Saturday, 9:00 AM – 6:00 PM Asia/Colombo timezone). We handle requests
          promptly and in the order received.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">5. Related Policies</h2>
        <p>
          For more information on our information handling practices, please review our{" "}
          <Link href="/privacy-policy" className="text-emerald-400 underline hover:text-emerald-300">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-emerald-400 underline hover:text-emerald-300">
            Terms of Service
          </Link>
          .
        </p>
      </section>
    </PolicyLayout>
  );
}
