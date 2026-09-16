"use client";

import React from "react";
import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { AdminCoexistenceView } from "@/components/admin-coexistence-view";

interface CoexistenceClientProps {
  appId: string;
  configId: string;
  userEmail?: string;
}

export default function CoexistenceClient({
  appId,
  configId,
  userEmail,
}: CoexistenceClientProps) {
  return (
    <div className="flex h-screen bg-[var(--app-bg)] text-[var(--text-primary)] font-sans overflow-hidden">
      {/* Primary Left Navigation Bar */}
      <AdminNav userEmail={userEmail} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--panel-bg)] overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 border-b border-[var(--panel-border)] bg-[var(--panel-header)] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
            >
              <span>&larr;</span>
              <span>Back to Inbox</span>
            </Link>
            <span className="text-[var(--text-muted)]">|</span>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-[var(--text-primary)] tracking-wide">
                WhatsApp Business App Coexistence
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 font-semibold border border-purple-500/20">
                Meta Onboarding
              </span>
            </div>
          </div>

          <div className="text-xs text-[var(--text-secondary)] font-mono">
            {userEmail}
          </div>
        </header>

        {/* Scrollable Form Content */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <AdminCoexistenceView appId={appId} configId={configId} />
        </main>
      </div>
    </div>
  );
}
