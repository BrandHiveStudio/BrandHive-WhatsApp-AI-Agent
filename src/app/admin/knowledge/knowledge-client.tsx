"use client";

import React from "react";
import { AdminNav } from "@/components/admin-nav";
import { AdminKnowledgeView } from "@/components/admin-knowledge-view";
import type { Service } from "@/lib/types";

interface KnowledgeClientProps {
  services: Service[];
  addons: any[];
  faqs: any[];
  settings: any[];
  userEmail: string;
}

export default function KnowledgeClient({
  services,
  addons,
  faqs,
  settings,
  userEmail,
}: KnowledgeClientProps) {
  return (
    <div className="flex h-screen bg-[var(--app-bg)] text-[var(--text-primary)] font-sans overflow-hidden">
      {/* Left Navigation Bar */}
      <AdminNav userEmail={userEmail} />

      {/* Main Knowledge Content View */}
      <AdminKnowledgeView
        initialServices={services}
        initialAddons={addons}
        initialFaqs={faqs}
        initialSettings={settings}
      />
    </div>
  );
}
