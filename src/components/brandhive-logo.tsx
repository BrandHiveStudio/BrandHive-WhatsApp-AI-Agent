"use client";

import React from "react";
import Image from "next/image";
import { useBranding } from "./branding-provider";

interface BrandHiveLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
  subtext?: string;
}

export function BrandHiveLogo({
  size = 38,
  className = "",
  showText = false,
  textClassName = "",
  subtext,
}: BrandHiveLogoProps) {
  const { logoUrl } = useBranding();
  const activeLogo = logoUrl || "/brandhive-logo-master.png";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official BrandHive Logo Container */}
      <div
        className="relative flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center transition-transform hover:scale-105 duration-200 shadow-xs bg-white border border-slate-200/60 dark:border-white/20 p-0.5"
        style={{
          width: size,
          height: size,
        }}
      >
        <Image
          src={activeLogo}
          alt="BrandHive Studio Logo"
          width={size}
          height={size}
          className="object-contain w-full h-full"
          priority
          unoptimized={activeLogo.startsWith("data:")}
        />
      </div>

      {showText && (
        <div className="flex flex-col min-w-0">
          <span
            className={`font-semibold text-sm tracking-tight text-[var(--text-primary)] truncate ${textClassName}`}
          >
            BrandHive Studio
          </span>
          {subtext ? (
            <span className="text-[11px] text-[var(--text-secondary)] truncate">
              {subtext}
            </span>
          ) : (
            <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--wa-green)]">
              AI Agent
            </span>
          )}
        </div>
      )}
    </div>
  );
}
