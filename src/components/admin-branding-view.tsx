"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { useBranding } from "./branding-provider";

export function AdminBrandingView() {
  const { logoUrl, isDefault, loading, updateLogo, resetLogo } = useBranding();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedBase64, setSelectedBase64] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeDisplayLogo = previewUrl || logoUrl || "/brandhive-logo-master.png";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate mime type
    const validTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setStatusMessage({
        type: "error",
        text: "Please select a valid image file (PNG, JPEG, WebP, or SVG).",
      });
      return;
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setStatusMessage({
        type: "error",
        text: "Image file is too large. Maximum allowed size is 2MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPreviewUrl(result);
      setSelectedBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!selectedBase64) return;
    setIsSaving(true);
    setStatusMessage(null);
    const res = await updateLogo(selectedBase64);
    setIsSaving(false);
    if (res.success) {
      setPreviewUrl(null);
      setSelectedBase64(null);
      setStatusMessage({
        type: "success",
        text: "Brand logo updated successfully across the entire Admin application.",
      });
    } else {
      setStatusMessage({
        type: "error",
        text: res.error || "Failed to save logo. Please try again.",
      });
    }
  };

  const handleResetToDefault = async () => {
    if (confirm("Reset to the official BrandHive Studio default master logo?")) {
      setIsSaving(true);
      setStatusMessage(null);
      const res = await resetLogo();
      setIsSaving(false);
      setPreviewUrl(null);
      setSelectedBase64(null);
      if (res.success) {
        setStatusMessage({
          type: "success",
          text: "Reset to default official BrandHive logo (brandhive-logo-master.png).",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to reset logo.",
        });
      }
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header Info */}
      <div className="bg-[var(--panel-header)] border border-[var(--panel-border)] rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-cyan)]/10 text-[var(--brand-cyan)] flex items-center justify-center border border-[var(--brand-cyan)]/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4" />
              <path d="M19 17v4" />
              <path d="M3 5h4" />
              <path d="M17 19h4" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Admin Logo & Branding Management
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Configure the active logo used across the Admin navigation, chat headers, and empty states.
            </p>
          </div>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium border flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}
        >
          <span>{statusMessage.type === "success" ? "✓" : "⚠️"}</span>
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Logo Preview & Configuration Card */}
      <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-2xl p-6 space-y-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            Active Logo Status
          </h3>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 rounded-xl bg-[var(--panel-header)] border border-[var(--panel-border)]">
            {/* Logo Preview Box */}
            <div className="w-24 h-24 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center p-3 shadow-inner flex-shrink-0 relative">
              <Image
                src={activeDisplayLogo}
                alt="Active BrandHive Logo"
                width={80}
                height={80}
                className="object-contain w-full h-full"
                unoptimized={activeDisplayLogo.startsWith("data:")}
              />
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {previewUrl ? "New Logo (Unsaved Preview)" : isDefault ? "Official Master Logo" : "Custom Brand Logo"}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-mono uppercase font-semibold ${
                    isDefault && !previewUrl
                      ? "bg-[var(--wa-green-badge)] text-[var(--wa-green-badge-text)]"
                      : "bg-[var(--brand-cyan)]/15 text-[var(--brand-cyan)]"
                  }`}
                >
                  {isDefault && !previewUrl ? "Default (Locked)" : "Active"}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {isDefault && !previewUrl
                  ? "Currently serving the default high-resolution asset (brandhive-logo-master.png)."
                  : previewUrl
                  ? "Previewing your new logo asset. Click 'Save & Apply Logo' below to activate it."
                  : "Serving your customized brand logo saved in persistent Supabase configuration."}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-[var(--panel-border)] flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp, image/svg+xml"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isSaving || loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--brand-cyan)] hover:bg-[var(--brand-cyan-hover)] text-slate-950 transition-colors flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Upload New Logo</span>
          </button>

          {previewUrl && (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--wa-green)] hover:bg-[var(--wa-green-hover)] text-white transition-colors flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save & Apply Logo"}
              </button>
              <button
                onClick={() => {
                  setPreviewUrl(null);
                  setSelectedBase64(null);
                }}
                disabled={isSaving}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-[var(--panel-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Cancel Preview
              </button>
            </>
          )}

          {!isDefault && !previewUrl && (
            <button
              onClick={handleResetToDefault}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-medium border border-[var(--panel-border)] hover:bg-[var(--panel-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-50"
            >
              Reset to Official Master Logo
            </button>
          )}
        </div>
      </div>

      {/* Guidelines */}
      <div className="p-4 rounded-xl bg-[var(--panel-hover)]/30 border border-[var(--panel-border)] text-xs text-[var(--text-muted)] space-y-1.5">
        <p className="font-semibold text-[var(--text-secondary)]">Recommendations:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Square aspect ratio (1:1) with transparent background (.PNG or .SVG).</li>
          <li>Recommended resolution: 512×512px or higher.</li>
          <li>Maximum file size: 2MB.</li>
          <li>The default official asset <code className="text-[11px] font-mono text-[var(--text-primary)]">brandhive-logo-master.png</code> is never deleted and can be restored at any time.</li>
        </ul>
      </div>
    </div>
  );
}
