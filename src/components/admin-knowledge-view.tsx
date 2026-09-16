"use client";

import React, { useState, useMemo, useEffect } from "react";
import { formatPriceDisplay } from "@/lib/knowledge/format";
import type { Service } from "@/lib/types";

interface AdminKnowledgeViewProps {
  initialServices?: Service[];
  initialAddons?: Array<{
    id: string;
    name: string;
    description: string | null;
    pricing_type: "fixed" | "starting_from" | "custom_quote";
    price: number | null;
    starting_price: number | null;
    currency: string;
    unit: string | null;
    service_id: string | null;
  }>;
  initialFaqs?: Array<{
    id: string;
    question: string;
    answer: string;
    category: string | null;
  }>;
  initialSettings?: Array<{
    key: string;
    value: unknown;
    description: string | null;
  }>;
}

type TabType = "services" | "addons" | "faqs" | "settings";

// In-memory module cache for instant 0ms subsequent tab navigation
let cachedKnowledgeData: {
  services: Service[];
  addons: any[];
  faqs: any[];
  settings: any[];
} | null = null;

export function AdminKnowledgeView({
  initialServices,
  initialAddons,
  initialFaqs,
  initialSettings,
}: AdminKnowledgeViewProps) {
  const [services, setServices] = useState<Service[]>(
    initialServices || cachedKnowledgeData?.services || []
  );
  const [addons, setAddons] = useState<any[]>(
    initialAddons || cachedKnowledgeData?.addons || []
  );
  const [faqs, setFaqs] = useState<any[]>(
    initialFaqs || cachedKnowledgeData?.faqs || []
  );
  const [settings, setSettings] = useState<any[]>(
    initialSettings || cachedKnowledgeData?.settings || []
  );
  const [loading, setLoading] = useState<boolean>(
    !initialServices?.length && !cachedKnowledgeData
  );

  const [activeTab, setActiveTab] = useState<TabType>("services");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    if (initialServices && initialServices.length > 0) {
      cachedKnowledgeData = {
        services: initialServices,
        addons: initialAddons || [],
        faqs: initialFaqs || [],
        settings: initialSettings || [],
      };
      return;
    }

    if (cachedKnowledgeData) {
      setServices(cachedKnowledgeData.services);
      setAddons(cachedKnowledgeData.addons);
      setFaqs(cachedKnowledgeData.faqs);
      setSettings(cachedKnowledgeData.settings);
      setLoading(false);
      return;
    }

    let active = true;
    fetch("/api/admin/knowledge")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setServices(data.services || []);
        setAddons(data.addons || []);
        setFaqs(data.faqs || []);
        setSettings(data.settings || []);
        cachedKnowledgeData = {
          services: data.services || [],
          addons: data.addons || [],
          faqs: data.faqs || [],
          settings: data.settings || [],
        };
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initialServices, initialAddons, initialFaqs, initialSettings]);

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return ["all", ...Array.from(set)];
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchCat =
        selectedCategory === "all" || s.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.slug && s.slug.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [services, selectedCategory, searchQuery]);

  const filteredAddons = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return addons;
    return addons.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q))
    );
  }, [addons, searchQuery]);

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return faqs;
    return faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        (f.category && f.category.toLowerCase().includes(q))
    );
  }, [faqs, searchQuery]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[var(--panel-bg)] overflow-hidden h-full">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-[var(--panel-border)] bg-[var(--panel-header)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-[var(--text-primary)] leading-tight">
              AI Knowledge Base
            </h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-[var(--wa-green-badge)] text-[var(--wa-green-badge-text)] font-semibold">
              Live Database ({services.length + addons.length + faqs.length + settings.length} items)
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Authoritative source used by Gemini AI tools for accurate service catalog & pricing answers.
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-72 md:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge catalog..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--search-bg)] text-[var(--text-primary)] placeholder-[var(--text-muted)] border border-[var(--panel-border)] focus:outline-none focus:border-[var(--wa-green)] transition-colors"
            />
            <svg
              className="absolute left-3 top-2.5 text-[var(--text-muted)]"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="px-6 border-b border-[var(--panel-border)] bg-[var(--panel-header)] flex items-center gap-6 text-xs font-medium overflow-x-auto select-none flex-shrink-0">
        <button
          onClick={() => {
            setActiveTab("services");
            setSelectedCategory("all");
          }}
          className={`py-3 relative transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === "services"
              ? "text-[var(--brand-cyan)] font-semibold"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Services & Packages ({services.length})
          {activeTab === "services" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand-cyan)] rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("addons")}
          className={`py-3 relative transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === "addons"
              ? "text-[var(--brand-cyan)] font-semibold"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Add-Ons ({addons.length})
          {activeTab === "addons" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand-cyan)] rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("faqs")}
          className={`py-3 relative transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === "faqs"
              ? "text-[var(--brand-cyan)] font-semibold"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          FAQs ({faqs.length})
          {activeTab === "faqs" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand-cyan)] rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`py-3 relative transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === "settings"
              ? "text-[var(--brand-cyan)] font-semibold"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Business Facts & Info ({settings.length})
          {activeTab === "settings" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand-cyan)] rounded-full" />
          )}
        </button>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-44 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 p-4"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Services Tab */}
            {activeTab === "services" && (
              <div className="space-y-4">
                {/* Category Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pb-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs transition-colors capitalize cursor-pointer ${
                        selectedCategory === cat
                          ? "bg-[var(--brand-cyan)] text-slate-950 font-semibold shadow-xs"
                          : "bg-[var(--panel-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {filteredServices.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--text-muted)] bg-[var(--panel-header)] rounded-2xl border border-[var(--panel-border)]">
                    No services matching &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredServices.map((service) => {
                      const metadata = (service.metadata ?? {}) as Record<string, unknown>;
                      const inclusions = Array.isArray(metadata.inclusions)
                        ? (metadata.inclusions as string[])
                        : [];

                      return (
                        <div
                          key={service.id}
                          className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-hover)]/40 p-4.5 flex flex-col justify-between hover:border-[var(--brand-cyan)]/40 transition-colors shadow-xs"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span
                                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold ${
                                  service.item_type === "package"
                                    ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                                    : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                                }`}
                              >
                                {service.item_type}
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)] font-mono">
                                {service.category}
                              </span>
                            </div>

                            <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                              {service.name}
                            </h3>
                            {service.description && (
                              <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                                {service.description}
                              </p>
                            )}

                            {/* Inclusions */}
                            {inclusions.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-[var(--panel-border)]">
                                <p className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider mb-1.5">
                                  Deliverables ({inclusions.length})
                                </p>
                                <ul className="text-xs text-[var(--text-secondary)] space-y-1">
                                  {inclusions.slice(0, 3).map((inc, idx) => (
                                    <li key={idx} className="flex items-start gap-1.5">
                                      <span className="text-[var(--wa-green)]">✓</span>
                                      <span className="truncate">{inc}</span>
                                    </li>
                                  ))}
                                  {inclusions.length > 3 && (
                                    <li className="text-[10px] text-[var(--text-muted)]">
                                      + {inclusions.length - 3} more deliverables
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Pricing Footer */}
                          <div className="mt-4 pt-3 border-t border-[var(--panel-border)] flex items-center justify-between">
                            <span className="text-xs font-semibold text-[var(--wa-green)]">
                              {formatPriceDisplay(service)}
                            </span>
                            {service.ad_budget_separate && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 font-medium">
                                + Ad Budget
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Add-Ons Tab */}
            {activeTab === "addons" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAddons.map((addon) => (
                  <div
                    key={addon.id}
                    className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-hover)]/40 p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-[var(--wa-green)] font-semibold">
                          Add-On
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {addon.service_id ? "Linked" : "Global"}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                        {addon.name}
                      </h3>
                      {addon.description && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          {addon.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-[var(--panel-border)]">
                      <span className="text-xs font-semibold text-[var(--wa-green)]">
                        {formatPriceDisplay(addon)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FAQs Tab */}
            {activeTab === "faqs" && (
              <div className="max-w-4xl space-y-3">
                {filteredFaqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 p-4"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        Q: {faq.question}
                      </h3>
                      {faq.category && (
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[var(--panel-border)] text-[var(--text-muted)] flex-shrink-0">
                          {faq.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5 whitespace-pre-wrap leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="max-w-4xl space-y-3">
                {settings.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-semibold text-[var(--brand-cyan)]">
                        {item.key}
                      </span>
                      {item.description && (
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {item.description}
                        </span>
                      )}
                    </div>
                    <pre className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--search-bg)] p-3 rounded-lg overflow-x-auto border border-[var(--panel-border)]">
                      {typeof item.value === "object"
                        ? JSON.stringify(item.value, null, 2)
                        : String(item.value)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
