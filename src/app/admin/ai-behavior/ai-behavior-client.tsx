"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DEFAULT_AI_BEHAVIOR } from "@/lib/ai-behavior";
import type { AIBehaviorConfig } from "@/lib/types";

interface AIBehaviorClientProps {
  initialConfig: AIBehaviorConfig;
  userEmail: string;
}

export default function AIBehaviorClient({
  initialConfig,
  userEmail,
}: AIBehaviorClientProps) {
  const [config, setConfig] = useState<AIBehaviorConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleChange = <K extends keyof AIBehaviorConfig>(
    field: K,
    value: AIBehaviorConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setStatusMessage(null);
  };

  const handleReset = () => {
    setConfig(DEFAULT_AI_BEHAVIOR);
    setStatusMessage({
      type: "success",
      text: "Reset to default BrandHive behavior settings. Click 'Save Changes' to persist.",
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/admin/ai-behavior", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
      }
      setStatusMessage({
        type: "success",
        text: "AI Conversation Behavior saved successfully!",
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-white/[0.08] bg-[#141414]/90 backdrop-blur sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Inbox
          </Link>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              AI
            </div>
            <h1 className="text-sm font-semibold tracking-wide">
              BrandHive Studio Admin — AI Conversation Behavior
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-white/40">{userEmail}</span>
          <Link
            href="/admin/coexistence"
            className="text-xs text-white/60 hover:text-white underline underline-offset-4"
          >
            Coexistence Onboarding
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">
        {/* Intro banner */}
        <div className="mb-8 p-5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-emerald-300">
                Core Principle: &quot;Creative with communication, strict with business facts.&quot;
              </h2>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">
                Configure tone, pacing, language mirroring, and personality for BrandHive&apos;s AI.
                <strong> Business facts</strong> (prices, services, packages, and FAQ policies) are always strictly protected and served directly from the authoritative database knowledge tools.
              </p>
            </div>
          </div>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-lg text-xs font-medium flex items-center gap-2 ${
              statusMessage.type === "success"
                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                : "bg-red-500/10 text-red-300 border border-red-500/30"
            }`}
          >
            {statusMessage.type === "success" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Tone & Personality Card */}
          <div className="p-6 rounded-xl bg-[#141414] border border-white/[0.08] space-y-5">
            <div className="border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-semibold text-white">Tone & Conversational Personality</h3>
              <p className="text-xs text-white/40 mt-0.5">Control how the AI speaks with customers on WhatsApp.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1.5">
                  Tone Style
                </label>
                <input
                  type="text"
                  value={config.tone}
                  onChange={(e) => handleChange("tone", e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                  placeholder="e.g. Friendly, professional, and approachable"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/80 mb-1.5">
                  Greeting Style
                </label>
                <input
                  type="text"
                  value={config.greeting_style}
                  onChange={(e) => handleChange("greeting_style", e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                  placeholder="e.g. Warm, concise, and helpful"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/80 mb-1.5">
                  Friendliness Level
                </label>
                <select
                  value={config.friendliness}
                  onChange={(e) => handleChange("friendliness", e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="high">High (Warm, inviting, supportive)</option>
                  <option value="medium">Medium (Polite, balanced)</option>
                  <option value="low">Low (Direct, formal)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/80 mb-1.5">
                  Professionalism Level
                </label>
                <select
                  value={config.professionalism}
                  onChange={(e) => handleChange("professionalism", e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="high">High (BrandHive studio caliber)</option>
                  <option value="medium">Medium (Casual business)</option>
                  <option value="low">Low (Very informal)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/80 mb-1.5">
                  Creativity Mode
                </label>
                <select
                  value={config.creativity}
                  onChange={(e) => handleChange("creativity", e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="moderate">Moderate (Engaging & natural; strict facts)</option>
                  <option value="low">Low (Concise, strictly minimal wording)</option>
                  <option value="high">High (Expressive & conversational)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/80 mb-1.5">
                  Emoji Usage
                </label>
                <select
                  value={config.emoji_usage}
                  onChange={(e) => handleChange("emoji_usage", e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="minimal">Minimal (Occasional natural emoji)</option>
                  <option value="none">None (No emojis)</option>
                  <option value="moderate">Moderate (Friendly WhatsApp feel)</option>
                  <option value="expressive">Expressive (Frequent emojis)</option>
                </select>
              </div>
            </div>
          </div>

          {/* WhatsApp Flow & Pacing Card */}
          <div className="p-6 rounded-xl bg-[#141414] border border-white/[0.08] space-y-5">
            <div className="border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-semibold text-white">WhatsApp Pacing & Response Flow</h3>
              <p className="text-xs text-white/40 mt-0.5">Control message length, question pacing, and sales approach.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1.5">
                  Response Length
                </label>
                <select
                  value={config.response_length}
                  onChange={(e) => handleChange("response_length", e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="short">Short (1–4 sentences; mobile-friendly, never essays)</option>
                  <option value="medium">Medium (Moderate detail when asked)</option>
                  <option value="detailed">Detailed (Full explanations)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/80 mb-1.5">
                  Question Pacing
                </label>
                <select
                  value={config.question_frequency}
                  onChange={(e) => handleChange("question_frequency", e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="one_at_a_time">One at a time (Never send questionnaires)</option>
                  <option value="progressive">Progressive (1-2 related discovery questions)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-white/80 mb-1.5">
                  Sales Approach
                </label>
                <input
                  type="text"
                  value={config.sales_approach}
                  onChange={(e) => handleChange("sales_approach", e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                  placeholder="e.g. Helpful before being sales-oriented; UNDERSTAND -> RECOMMEND -> SELL"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-white/80 mb-1.5">
                  Human Escalation Protocol
                </label>
                <input
                  type="text"
                  value={config.human_escalation_behavior}
                  onChange={(e) => handleChange("human_escalation_behavior", e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                  placeholder="Directive when human intervention is requested"
                  required
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="pt-2 border-t border-white/[0.06] space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.language_mirroring}
                  onChange={(e) => handleChange("language_mirroring", e.target.checked)}
                  className="mt-0.5 rounded border-white/20 bg-[#1e1e1e] text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-xs font-medium text-white block">
                    Multilingual & Style Mirroring
                  </span>
                  <span className="text-[11px] text-white/40 block mt-0.5">
                    Naturally mirror English, Sinhala script, Tamil script, Singlish (Latin Sinhala), Tanglish (Latin Tamil), and mixed-language messages. Never force-convert Singlish/Tanglish to formal English.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.whatsapp_formatting}
                  onChange={(e) => handleChange("whatsapp_formatting", e.target.checked)}
                  className="mt-0.5 rounded border-white/20 bg-[#1e1e1e] text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-xs font-medium text-white block">
                    WhatsApp Mobile Formatting
                  </span>
                  <span className="text-[11px] text-white/40 block mt-0.5">
                    Format with short paragraphs, clear spacing, and simple bullet points for lists.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Custom Admin Instructions */}
          <div className="p-6 rounded-xl bg-[#141414] border border-white/[0.08] space-y-3">
            <div className="border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-semibold text-white">Custom AI Directives</h3>
              <p className="text-xs text-white/40 mt-0.5">
                Add optional specific behavioral instructions (e.g. seasonal focus, phrasing nuances).
              </p>
            </div>
            <textarea
              rows={3}
              value={config.custom_instructions || ""}
              onChange={(e) => handleChange("custom_instructions", e.target.value)}
              className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-emerald-500/60 font-mono"
              placeholder="e.g. When greeting in the morning, wish them a productive day. Emphasize that our team is based in Colombo."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 text-white/60 hover:text-white text-xs transition-colors"
            >
              Reset to BrandHive Defaults
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
