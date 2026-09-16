"use client";

import React, { useState, useEffect } from "react";
import { DEFAULT_AI_BEHAVIOR } from "@/lib/ai-behavior";
import type { AIBehaviorConfig } from "@/lib/types";

interface AdminBehaviorViewProps {
  initialConfig?: AIBehaviorConfig;
}

let cachedBehaviorConfig: AIBehaviorConfig | null = null;

export function AdminBehaviorView({ initialConfig }: AdminBehaviorViewProps) {
  const [config, setConfig] = useState<AIBehaviorConfig>(
    initialConfig || cachedBehaviorConfig || DEFAULT_AI_BEHAVIOR
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!initialConfig && !cachedBehaviorConfig);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (initialConfig) {
      cachedBehaviorConfig = initialConfig;
      return;
    }
    if (cachedBehaviorConfig) {
      setConfig(cachedBehaviorConfig);
      setLoading(false);
      return;
    }

    let active = true;
    fetch("/api/admin/ai-behavior")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.config) return;
        setConfig(data.config);
        cachedBehaviorConfig = data.config;
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initialConfig]);

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
        cachedBehaviorConfig = data.config;
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-24 rounded-2xl bg-[var(--panel-header)] border border-[var(--panel-border)]" />
        <div className="h-64 rounded-2xl bg-[var(--panel-header)] border border-[var(--panel-border)]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Principle Banner */}
      <div className="p-4.5 rounded-2xl bg-[var(--wa-green-badge)]/40 border border-[var(--wa-green)]/20 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-[var(--wa-green)] text-white flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">
          🤖
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Golden Rule: &ldquo;Creative with communication, strict with business facts.&rdquo;
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
            Configure tone, friendliness, pacing, and personality for BrandHive&apos;s AI.
            <strong> Business facts</strong> (services, prices, package inclusions, and FAQs) are always protected and served authoritatively from the database.
          </p>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 text-[var(--wa-green)] border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Persona Section */}
        <div className="p-6 rounded-2xl bg-[var(--panel-header)] border border-[var(--panel-border)] space-y-4">
          <div className="border-b border-[var(--panel-border)] pb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Personality & Voice
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Controls the overall demeanor and conversational register.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Conversational Tone
              </label>
              <input
                type="text"
                value={config.tone}
                onChange={(e) => handleChange("tone", e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)] transition-colors"
                placeholder="e.g. Friendly, professional, and approachable"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Friendliness Level
              </label>
              <select
                value={config.friendliness}
                onChange={(e) =>
                  handleChange(
                    "friendliness",
                    e.target.value as AIBehaviorConfig["friendliness"]
                  )
                }
                className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)] transition-colors"
              >
                <option value="high">High (Warm & Consultative)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="low">Low (Direct & Reserved)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Response Length Target
              </label>
              <select
                value={config.response_length}
                onChange={(e) =>
                  handleChange(
                    "response_length",
                    e.target.value as AIBehaviorConfig["response_length"]
                  )
                }
                className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)] transition-colors"
              >
                <option value="short">Short (1-3 sentences, ideal for WhatsApp)</option>
                <option value="medium">Medium (Detailed overview)</option>
                <option value="concise">Ultra-Concise</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Emoji Usage
              </label>
              <select
                value={config.emoji_usage}
                onChange={(e) =>
                  handleChange(
                    "emoji_usage",
                    e.target.value as AIBehaviorConfig["emoji_usage"]
                  )
                }
                className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)] transition-colors"
              >
                <option value="moderate">Moderate (Natural, 1-2 per message)</option>
                <option value="minimal">Minimal</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
        </div>

        {/* Consultation & Flow Section */}
        <div className="p-6 rounded-2xl bg-[var(--panel-header)] border border-[var(--panel-border)] space-y-4">
          <div className="border-b border-[var(--panel-border)] pb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Sales & Interaction Flow
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              How questions are asked and how human handoffs are triggered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Question Pacing
              </label>
              <select
                value={config.question_frequency}
                onChange={(e) =>
                  handleChange("question_frequency", e.target.value)
                }
                className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)] transition-colors"
              >
                <option value="one_at_a_time">One at a time (Never send questionnaires)</option>
                <option value="progressive">Progressive (1-2 discovery questions)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Sales Approach
              </label>
              <input
                type="text"
                value={config.sales_approach}
                onChange={(e) => handleChange("sales_approach", e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)] transition-colors"
                placeholder="e.g. Helpful before being sales-oriented; UNDERSTAND -> RECOMMEND -> SELL"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Human Escalation Protocol
              </label>
              <input
                type="text"
                value={config.human_escalation_behavior}
                onChange={(e) =>
                  handleChange("human_escalation_behavior", e.target.value)
                }
                className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)] transition-colors"
                placeholder="Directive when human intervention is requested"
                required
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="pt-3 border-t border-[var(--panel-border)] space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.language_mirroring}
                onChange={(e) => handleChange("language_mirroring", e.target.checked)}
                className="mt-0.5 rounded border-[var(--panel-border)] text-[var(--wa-green)] focus:ring-[var(--wa-green)]"
              />
              <div>
                <span className="text-xs font-medium text-[var(--text-primary)] block">
                  Multilingual & Style Mirroring
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] block mt-0.5">
                  Naturally mirror English, Sinhala script, Tamil script, Singlish (Latin Sinhala), Tanglish (Latin Tamil), and mixed messages. Never force-convert Singlish/Tanglish to English.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.whatsapp_formatting}
                onChange={(e) => handleChange("whatsapp_formatting", e.target.checked)}
                className="mt-0.5 rounded border-[var(--panel-border)] text-[var(--wa-green)] focus:ring-[var(--wa-green)]"
              />
              <div>
                <span className="text-xs font-medium text-[var(--text-primary)] block">
                  WhatsApp Mobile Formatting
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] block mt-0.5">
                  Format with short paragraphs, clean spacing, and simple bullet points.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Custom Directives */}
        <div className="p-6 rounded-2xl bg-[var(--panel-header)] border border-[var(--panel-border)] space-y-3">
          <div className="border-b border-[var(--panel-border)] pb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Custom AI Directives
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Add optional specific behavioral instructions (e.g. seasonal focus, phrasing nuances).
            </p>
          </div>
          <textarea
            rows={3}
            value={config.custom_instructions || ""}
            onChange={(e) => handleChange("custom_instructions", e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)] font-mono transition-colors"
            placeholder="e.g. When greeting in the morning, wish them a productive day. Emphasize that our team is based in Colombo."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-xl border border-[var(--panel-border)] hover:bg-[var(--panel-hover)] text-xs text-[var(--text-secondary)] transition-colors cursor-pointer"
          >
            Reset to BrandHive Defaults
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-[var(--wa-green)] hover:bg-[var(--wa-green-hover)] disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
