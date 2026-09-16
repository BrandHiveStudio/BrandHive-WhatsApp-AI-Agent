"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandHiveLogo } from "./brandhive-logo";
import { ThemeToggle } from "./theme-toggle";

interface AdminNavProps {
  userEmail?: string;
}

export function AdminNav({ userEmail }: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const navItems = [
    {
      href: "/",
      label: "Chats",
      description: "WhatsApp Inbox",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      isActive: pathname === "/",
    },
    {
      href: "/admin/knowledge",
      label: "AI Knowledge",
      description: "Services, Pricing & FAQs",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
          <path d="M6 14h7" />
        </svg>
      ),
      isActive: pathname === "/admin/knowledge",
    },
    {
      href: "/admin/ai-behavior",
      label: "AI Behavior",
      description: "Tone, Style & Personality",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
          <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66 1.41-1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ),
      isActive: pathname.startsWith("/admin/ai-behavior"),
    },
    {
      href: "/admin/coexistence",
      label: "Coexistence",
      description: "WhatsApp Business App Link",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
          <path d="M12 18h.01" />
        </svg>
      ),
      isActive: pathname.startsWith("/admin/coexistence"),
    },
  ];

  return (
    <aside className="w-16 md:w-[68px] flex-shrink-0 bg-[var(--nav-bg)] border-r border-[var(--panel-border)] flex flex-col items-center justify-between py-4 select-none z-30 transition-colors">
      {/* Top Section: Logo & Main Navigation */}
      <div className="flex flex-col items-center gap-6 w-full">
        {/* BrandHive Logo Header */}
        <Link
          href="/"
          className="group flex flex-col items-center p-1 rounded-xl hover:opacity-90 transition-opacity"
          title="BrandHive Studio Dashboard"
        >
          <BrandHiveLogo size={42} />
        </Link>

        {/* Navigation Items */}
        <nav className="flex flex-col items-center gap-2 w-full px-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={`${item.label} — ${item.description}`}
              className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 group ${
                item.isActive
                  ? "bg-[var(--panel-active)] text-[var(--wa-green)] font-semibold shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel-hover)]"
              }`}
            >
              {item.icon}

              {/* Active Indicator Strip */}
              {item.isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[var(--wa-green)] rounded-r-full" />
              )}
            </Link>
          ))}
        </nav>
      </div>

      {/* Bottom Section: Theme Switcher & Actions */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        {/* Light / Dark Mode Toggle */}
        <ThemeToggle className="w-11 h-11" />

        {/* Sign Out Action */}
        <button
          onClick={handleSignOut}
          title={userEmail ? `Sign out (${userEmail})` : "Sign out"}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
          aria-label="Sign out"
        >
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
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
