"use client";

import React from "react";
import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { AdminBehaviorView } from "@/components/admin-behavior-view";
import type { AIBehaviorConfig } from "@/lib/types";

interface AIBehaviorClientProps {
  initialConfig: AIBehaviorConfig;
  userEmail: string;
}

export default function AIBehaviorClient({
  initialConfig,
  userEmail,
}: AIBehaviorClientProps) {
  return (
    <div className="flex h-screen bg-[var(--app-bg)] text-[var(--text-primary)] font-sans overflow-hidden">
      {/* Left Navigation Bar */}
      <AdminNav userEmail={userEmail} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--panel-bg)] overflow-hidden">
        {/* Top Header */}
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
                AI Conversation Behavior
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-[var(--wa-green-badge)] text-[var(--wa-green-badge-text)] font-semibold">
                Runtime
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/knowledge"
              className="text-xs text-[var(--brand-cyan)] hover:underline font-medium"
            >
              View Knowledge Base
            </Link>
          </div>
        </header>

        {/* Form Container */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <AdminBehaviorView initialConfig={initialConfig} />
        </main>
      </div>
    </div>
  );
}
