"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandHiveLogo } from "./brandhive-logo";
import { ThemeToggle } from "./theme-toggle";

export type AdminTab = "chats" | "knowledge" | "behavior" | "coexistence" | "branding";

interface AdminNavProps {
  userEmail?: string;
  activeTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
}

export function AdminNav({ userEmail, activeTab, onTabChange }: AdminNavProps) {
  const pathname = usePathname();

  const navItems: Array<{
    id: AdminTab;
    href: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    isActive: boolean;
  }> = [
    {
      id: "chats",
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
      isActive: activeTab ? activeTab === "chats" : pathname === "/",
    },
    {
      id: "knowledge",
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
      isActive: activeTab ? activeTab === "knowledge" : pathname.startsWith("/admin/knowledge"),
    },
    {
      id: "behavior",
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
      isActive: activeTab ? activeTab === "behavior" : pathname.startsWith("/admin/ai-behavior"),
    },
    {
      id: "coexistence",
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
      isActive: activeTab ? activeTab === "coexistence" : pathname.startsWith("/admin/coexistence"),
    },
    {
      id: "branding",
      href: "/admin/branding",
      label: "Branding",
      description: "Logo & Brand Settings",
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
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2Z" />
        </svg>
      ),
      isActive: activeTab ? activeTab === "branding" : pathname.startsWith("/admin/branding"),
    },
  ];

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    item: (typeof navItems)[0]
  ) => {
    if (onTabChange) {
      e.preventDefault();
      onTabChange(item.id);
      window.history.pushState(null, "", item.href);
    }
  };

  return (
    <aside className="w-16 md:w-[68px] flex-shrink-0 bg-[var(--nav-bg)] border-r border-[var(--panel-border)] flex flex-col items-center justify-between py-4 select-none z-30 transition-colors">
      {/* Top Section: Logo & Main Navigation */}
      <div className="flex flex-col items-center gap-6 w-full">
        {/* BrandHive Logo Header */}
        <Link
          href="/"
          onClick={(e) => {
            if (onTabChange) {
              e.preventDefault();
              onTabChange("chats");
              window.history.pushState(null, "", "/");
            }
          }}
          className="group flex flex-col items-center p-1 rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
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
              prefetch={true}
              onClick={(e) => handleNavClick(e, item)}
              title={`${item.label} — ${item.description}`}
              className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 group cursor-pointer ${
                item.isActive
                  ? "bg-[var(--panel-active)] text-[var(--wa-green)] font-semibold shadow-xs"
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

      {/* Bottom Section: Theme Switcher Only (Sign Out permanently removed from Admin UI) */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        {/* Light / Dark Mode Toggle */}
        <ThemeToggle className="w-11 h-11" />
      </div>
    </aside>
  );
}
