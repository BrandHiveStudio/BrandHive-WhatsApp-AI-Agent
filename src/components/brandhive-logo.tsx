import React from "react";
import Image from "next/image";

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
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official BrandHive Logo Container */}
      <div
        className="relative flex-shrink-0 rounded-xl overflow-hidden p-1 flex items-center justify-center transition-transform hover:scale-105 duration-200 shadow-sm"
        style={{
          width: size,
          height: size,
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(134, 150, 160, 0.2)",
        }}
      >
        <Image
          src="/brandhive-logo-master.png"
          alt="BrandHive Studio Logo"
          width={size - 8}
          height={size - 8}
          className="object-contain w-full h-full"
          priority
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
