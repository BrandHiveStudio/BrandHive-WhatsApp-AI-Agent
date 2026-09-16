"use client";

import React from "react";
import { AdminNav } from "@/components/admin-nav";
import { AdminBrandingView } from "@/components/admin-branding-view";

interface BrandingClientProps {
  userEmail: string;
}

export default function BrandingClient({ userEmail }: BrandingClientProps) {
  return (
    <div className="flex h-screen bg-[var(--app-bg)] text-[var(--text-primary)] font-sans overflow-hidden">
      <AdminNav userEmail={userEmail} />

      <main className="flex-1 flex flex-col min-w-0 bg-[var(--panel-bg)] overflow-hidden">
        <header className="px-6 py-4 border-b border-[var(--panel-border)] bg-[var(--panel-header)] flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-[var(--text-primary)] leading-tight">
              Logo & Branding Settings
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Customize the active logo displayed throughout the WhatsApp AI Agent Admin portal.
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <AdminBrandingView />
        </div>
      </main>
    </div>
  );
}
