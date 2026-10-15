"use client";

import React, { useState } from "react";

export interface ContactAvatarProps {
  name?: string | null;
  phone: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showStatusBadge?: boolean;
  mode?: "agent" | "human";
}

const GRADIENT_PALETTES = [
  "from-emerald-600 to-teal-800",
  "from-cyan-600 to-blue-800",
  "from-indigo-600 to-violet-800",
  "from-teal-600 to-emerald-800",
  "from-amber-600 to-orange-800",
  "from-sky-600 to-indigo-800",
  "from-violet-600 to-purple-800",
  "from-blue-600 to-cyan-800",
];

export function getAvatarInitials(name?: string | null, phone?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase();
  }
  if (phone && phone.trim()) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 2) {
      return digits.slice(-2);
    }
    return phone.slice(-2);
  }
  return "WA";
}

export function getAvatarGradient(seed: string): string {
  if (!seed) return GRADIENT_PALETTES[0];
  let sum = 0;
  for (let i = 0; i < seed.length; i++) {
    sum += seed.charCodeAt(i);
  }
  return GRADIENT_PALETTES[sum % GRADIENT_PALETTES.length];
}

const SIZE_CLASSES = {
  sm: "w-8 h-8 text-[11px]",
  md: "w-10 h-10 text-xs",
  lg: "w-12 h-12 text-sm",
  xl: "w-14 h-14 text-base",
};

const BADGE_SIZE_CLASSES = {
  sm: "w-3.5 h-3.5 text-[9px]",
  md: "w-4 h-4 text-[10px]",
  lg: "w-4 h-4 text-[10px]",
  xl: "w-4.5 h-4.5 text-[11px]",
};

/**
 * WhatsApp Web-inspired Contact Avatar with reliable fallback.
 *
 * Requirements:
 * - Genuine contact photos are displayed when securely and reliably provided.
 * - Graceful fallback avatars with deterministic initials and brand-aligned gradients when photos are unavailable.
 * - Never shows broken images or server secrets.
 */
export function ContactAvatar({
  name,
  phone,
  photoUrl,
  size = "md",
  className = "",
  showStatusBadge = false,
  mode,
}: ContactAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const initials = getAvatarInitials(name, phone);
  const gradient = getAvatarGradient(phone || name || "seed");
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const badgeSizeClass = BADGE_SIZE_CLASSES[size] || BADGE_SIZE_CLASSES.md;

  const displayName = name || phone || "Contact";

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {photoUrl && !imgFailed ? (
        <img
          src={photoUrl}
          alt={displayName}
          onError={() => setImgFailed(true)}
          className={`${sizeClass} rounded-full object-cover shadow-2xs border border-[var(--panel-border)]/50 select-none`}
        />
      ) : (
        <div
          className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold shadow-2xs select-none`}
          aria-label={displayName}
          title={displayName}
        >
          {initials}
        </div>
      )}

      {showStatusBadge && mode && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${badgeSizeClass} rounded-full bg-[var(--panel-bg)] flex items-center justify-center shadow-xs border border-[var(--panel-border)]`}
          title={mode === "agent" ? "AI Auto-Reply Active" : "Human Takeover Active"}
        >
          {mode === "agent" ? "🤖" : "👤"}
        </span>
      )}
    </div>
  );
}
