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
    active: boolean;
  }>;
  initialFaqs?: Array<{
    id: string;
    question: string;
    answer: string;
    category: string | null;
    active: boolean;
    display_order: number;
  }>;
  initialSettings?: Array<{
    key: string;
    value: unknown;
    description: string | null;
    active: boolean;
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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // CMS Modal States
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    section: TabType;
    item?: any;
  } | null>(null);

  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    section: TabType;
    item: any;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form Field State
  const [formFields, setFormFields] = useState<Record<string, any>>({});

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

  // Update in-memory cache whenever local state changes
  const updateCache = (newServices = services, newAddons = addons, newFaqs = faqs, newSettings = settings) => {
    cachedKnowledgeData = {
      services: newServices,
      addons: newAddons,
      faqs: newFaqs,
      settings: newSettings,
    };
  };

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Open Create Modal
  const handleOpenCreate = (section: TabType) => {
    if (section === "services") {
      setFormFields({
        name: "",
        slug: "",
        category: "branding",
        item_type: "service",
        pricing_type: "fixed",
        price: 15000,
        starting_price: 15000,
        currency: "LKR",
        unit: "",
        description: "",
        ad_budget_separate: false,
        active: true,
        display_order: 50,
        inclusions: "",
      });
    } else if (section === "addons") {
      setFormFields({
        name: "",
        service_id: "",
        description: "",
        pricing_type: "fixed",
        price: 5000,
        starting_price: 5000,
        currency: "LKR",
        unit: "",
        active: true,
      });
    } else if (section === "faqs") {
      setFormFields({
        question: "",
        answer: "",
        category: "general",
        display_order: 50,
        active: true,
      });
    } else if (section === "settings") {
      setFormFields({
        key: "",
        value: "",
        description: "",
        active: true,
      });
    }
    setModalState({ isOpen: true, mode: "create", section });
  };

  // Open Edit Modal
  const handleOpenEdit = (section: TabType, item: any) => {
    if (section === "services") {
      const metadata = (item.metadata || {}) as Record<string, any>;
      const inclusions = Array.isArray(metadata.inclusions) ? metadata.inclusions.join("\n") : "";
      setFormFields({
        name: item.name || "",
        slug: item.slug || "",
        category: item.category || "general",
        item_type: item.item_type || "service",
        pricing_type: item.pricing_type || "fixed",
        price: item.price !== null && item.price !== undefined ? item.price : "",
        starting_price: item.starting_price !== null && item.starting_price !== undefined ? item.starting_price : "",
        currency: item.currency || "LKR",
        unit: item.unit || "",
        description: item.description || "",
        ad_budget_separate: !!item.ad_budget_separate,
        active: item.active !== false,
        display_order: item.display_order || 50,
        inclusions,
      });
    } else if (section === "addons") {
      setFormFields({
        name: item.name || "",
        service_id: item.service_id || "",
        description: item.description || "",
        pricing_type: item.pricing_type || "fixed",
        price: item.price !== null && item.price !== undefined ? item.price : "",
        starting_price: item.starting_price !== null && item.starting_price !== undefined ? item.starting_price : "",
        currency: item.currency || "LKR",
        unit: item.unit || "",
        active: item.active !== false,
      });
    } else if (section === "faqs") {
      setFormFields({
        question: item.question || "",
        answer: item.answer || "",
        category: item.category || "general",
        display_order: item.display_order || 50,
        active: item.active !== false,
      });
    } else if (section === "settings") {
      setFormFields({
        key: item.key || "",
        value: typeof item.value === "object" ? JSON.stringify(item.value, null, 2) : String(item.value ?? ""),
        description: item.description || "",
        active: item.active !== false,
      });
    }
    setModalState({ isOpen: true, mode: "edit", section, item });
  };

  // Toggle Active Status
  const handleToggleActive = async (section: TabType, item: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newActive = !item.active;
    const targetId = section === "settings" ? item.key : item.id;

    // Optimistic UI Update
    if (section === "services") {
      const updated = services.map((s) => (s.id === item.id ? { ...s, active: newActive } : s));
      setServices(updated);
      updateCache(updated, addons, faqs, settings);
    } else if (section === "addons") {
      const updated = addons.map((a) => (a.id === item.id ? { ...a, active: newActive } : a));
      setAddons(updated);
      updateCache(services, updated, faqs, settings);
    } else if (section === "faqs") {
      const updated = faqs.map((f) => (f.id === item.id ? { ...f, active: newActive } : f));
      setFaqs(updated);
      updateCache(services, addons, updated, settings);
    } else if (section === "settings") {
      const updated = settings.map((s) => (s.key === item.key ? { ...s, active: newActive } : s));
      setSettings(updated);
      updateCache(services, addons, faqs, updated);
    }

    try {
      const res = await fetch("/api/admin/knowledge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          id: section !== "settings" ? targetId : undefined,
          key: section === "settings" ? targetId : undefined,
          record: { active: newActive },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status on server");
      }
      showFeedback("success", `Updated ${section} status to ${newActive ? "Active" : "Inactive"}.`);
    } catch {
      showFeedback("error", "Error updating status. Please refresh.");
    }
  };

  // Handle Form Submit (Create / Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalState) return;
    setIsSubmitting(true);

    try {
      const { section, mode, item } = modalState;
      const recordPayload: Record<string, any> = { ...formFields };

      if (section === "services") {
        const lines = (formFields.inclusions || "")
          .split("\n")
          .map((l: string) => l.trim())
          .filter(Boolean);
        recordPayload.metadata = {
          ...(item?.metadata || {}),
          inclusions: lines,
        };
        delete recordPayload.inclusions;
      }

      let res: Response;
      if (mode === "create") {
        res = await fetch("/api/admin/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, record: recordPayload }),
        });
      } else {
        const id = section !== "settings" ? item.id : undefined;
        const key = section === "settings" ? item.key : undefined;
        res = await fetch("/api/admin/knowledge", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, id, key, record: recordPayload }),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save record");
      }

      const resData = await res.json();
      const savedRecord = resData.record;

      // Update State Immediately
      if (section === "services") {
        const updated = mode === "create" ? [...services, savedRecord] : services.map((s) => (s.id === savedRecord.id ? savedRecord : s));
        setServices(updated);
        updateCache(updated, addons, faqs, settings);
      } else if (section === "addons") {
        const updated = mode === "create" ? [...addons, savedRecord] : addons.map((a) => (a.id === savedRecord.id ? savedRecord : a));
        setAddons(updated);
        updateCache(services, updated, faqs, settings);
      } else if (section === "faqs") {
        const updated = mode === "create" ? [...faqs, savedRecord] : faqs.map((f) => (f.id === savedRecord.id ? savedRecord : f));
        setFaqs(updated);
        updateCache(services, addons, updated, settings);
      } else if (section === "settings") {
        const updated = mode === "create" ? [...settings, savedRecord] : settings.map((s) => (s.key === savedRecord.key ? savedRecord : s));
        setSettings(updated);
        updateCache(services, addons, faqs, updated);
      }

      setModalState(null);
      showFeedback("success", `Record saved successfully! AI Agent will use this updated knowledge immediately.`);
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Failed to save record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete / Archive
  const handleDeleteConfirm = async (permanent = false) => {
    if (!deleteDialog) return;
    setIsSubmitting(true);
    const { section, item } = deleteDialog;
    const targetId = section === "settings" ? item.key : item.id;

    try {
      const res = await fetch("/api/admin/knowledge", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          id: section !== "settings" ? targetId : undefined,
          key: section === "settings" ? targetId : undefined,
          permanent,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to process delete request");
      }

      if (permanent) {
        if (section === "services") {
          const updated = services.filter((s) => s.id !== item.id);
          setServices(updated);
          updateCache(updated, addons, faqs, settings);
        } else if (section === "addons") {
          const updated = addons.filter((a) => a.id !== item.id);
          setAddons(updated);
          updateCache(services, updated, faqs, settings);
        } else if (section === "faqs") {
          const updated = faqs.filter((f) => f.id !== item.id);
          setFaqs(updated);
          updateCache(services, addons, updated, settings);
        } else if (section === "settings") {
          const updated = settings.filter((s) => s.key !== item.key);
          setSettings(updated);
          updateCache(services, addons, faqs, updated);
        }
        showFeedback("success", `Record permanently deleted from Supabase knowledge database.`);
      } else {
        // Soft archived (active: false)
        if (section === "services") {
          const updated = services.map((s) => (s.id === item.id ? { ...s, active: false } : s));
          setServices(updated);
          updateCache(updated, addons, faqs, settings);
        } else if (section === "addons") {
          const updated = addons.map((a) => (a.id === item.id ? { ...a, active: false } : a));
          setAddons(updated);
          updateCache(services, updated, faqs, settings);
        } else if (section === "faqs") {
          const updated = faqs.map((f) => (f.id === item.id ? { ...f, active: false } : f));
          setFaqs(updated);
          updateCache(services, addons, updated, settings);
        } else if (section === "settings") {
          const updated = settings.map((s) => (s.key === item.key ? { ...s, active: false } : s));
          setSettings(updated);
          updateCache(services, addons, faqs, updated);
        }
        showFeedback("success", `Record archived. AI Agent will no longer present it.`);
      }

      setDeleteDialog(null);
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Error deleting record");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Categories for Services
  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return ["all", ...Array.from(set)];
  }, [services]);

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchCat = selectedCategory === "all" || s.category === selectedCategory;
      const matchStatus = statusFilter === "all" || (statusFilter === "active" ? s.active : !s.active);
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.slug && s.slug.toLowerCase().includes(q));
      return matchCat && matchStatus && matchSearch;
    });
  }, [services, selectedCategory, statusFilter, searchQuery]);

  // Filtered Add-ons
  const filteredAddons = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return addons.filter((a) => {
      const matchStatus = statusFilter === "all" || (statusFilter === "active" ? a.active : !a.active);
      const matchSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [addons, statusFilter, searchQuery]);

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return faqs.filter((f) => {
      const matchStatus = statusFilter === "all" || (statusFilter === "active" ? f.active : !f.active);
      const matchSearch =
        !q ||
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        (f.category && f.category.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [faqs, statusFilter, searchQuery]);

  // Filtered Settings
  const filteredSettings = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return settings.filter((s) => {
      const matchStatus = statusFilter === "all" || (statusFilter === "active" ? s.active : !s.active);
      const matchSearch =
        !q ||
        s.key.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        String(s.value).toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [settings, statusFilter, searchQuery]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[var(--panel-bg)] overflow-hidden h-full relative">
      {/* Toast Feedback Notification */}
      {feedback && (
        <div
          className={`absolute top-4 right-6 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg border flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-950 text-emerald-300 border-emerald-800"
              : "bg-red-950 text-red-300 border-red-800"
          }`}
        >
          <span>{feedback.type === "success" ? "✓" : "⚠️"}</span>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="px-6 py-4 border-b border-[var(--panel-border)] bg-[var(--panel-header)] flex flex-col lg:flex-row lg:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-[var(--text-primary)] leading-tight">
              AI Knowledge Base Management
            </h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-[var(--brand-cyan)]/15 text-[var(--brand-cyan)] font-semibold border border-[var(--brand-cyan)]/25">
              Live Supabase CMS ({services.length + addons.length + faqs.length + settings.length} items)
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Authoritative source used by Gemini AI tools. Any additions or price changes sync live to customer WhatsApp chats.
          </p>
        </div>

        {/* Controls: Search, Status Filter & Add New Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative w-full sm:w-60 md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--search-bg)] text-[var(--text-primary)] placeholder-[var(--text-muted)] border border-[var(--panel-border)] focus:outline-none focus:border-[var(--brand-cyan)] transition-colors"
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
                className="absolute right-3 top-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter (All / Active / Inactive) */}
          <div className="flex items-center rounded-xl bg-[var(--search-bg)] border border-[var(--panel-border)] p-0.5 text-[11px]">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === "all" ? "bg-[var(--panel-active)] text-[var(--text-primary)] font-semibold" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === "active" ? "bg-emerald-500/20 text-emerald-400 font-semibold" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === "inactive" ? "bg-red-500/20 text-red-400 font-semibold" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Inactive
            </button>
          </div>

          {/* "+ Add New" Primary Action */}
          <button
            onClick={() => handleOpenCreate(activeTab)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--brand-cyan)] hover:bg-[var(--brand-cyan-hover)] text-slate-950 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span className="text-sm leading-none font-bold">+</span>
            <span>Add {activeTab === "services" ? "Service" : activeTab === "addons" ? "Add-On" : activeTab === "faqs" ? "FAQ" : "Business Fact"}</span>
          </button>
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
                    No services found matching filters.
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
                          className={`rounded-xl border p-4.5 flex flex-col justify-between transition-all shadow-xs relative group ${
                            service.active
                              ? "bg-[var(--panel-header)] border-[var(--panel-border)] hover:border-[var(--brand-cyan)]/40"
                              : "bg-[var(--panel-bg)]/60 border-[var(--panel-border)] opacity-60 hover:opacity-100"
                          }`}
                        >
                          <div>
                            {/* Top Meta & Badges */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold ${
                                    service.item_type === "package"
                                      ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                                      : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                                  }`}
                                >
                                  {service.item_type}
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                  {service.category}
                                </span>
                              </div>

                              {/* Active Status Badge / Toggle */}
                              <button
                                onClick={(e) => handleToggleActive("services", service, e)}
                                title={service.active ? "Click to deactivate service" : "Click to activate service"}
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer border flex items-center gap-1 ${
                                  service.active
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                    : "bg-neutral-800 text-neutral-400 border-neutral-700"
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${service.active ? "bg-emerald-400" : "bg-neutral-500"}`} />
                                <span>{service.active ? "Active" : "Inactive"}</span>
                              </button>
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

                          {/* Pricing Footer & Actions */}
                          <div className="mt-4 pt-3 border-t border-[var(--panel-border)] flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-[var(--wa-green)]">
                                {formatPriceDisplay(service)}
                              </span>
                              {service.ad_budget_separate && (
                                <span className="text-[9px] text-amber-400 font-medium">
                                  + Ad Budget Separate
                                </span>
                              )}
                            </div>

                            {/* Action Buttons: Edit & Delete */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenEdit("services", service)}
                                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--panel-active)] text-[var(--text-primary)] hover:bg-[var(--brand-cyan)] hover:text-slate-950 transition-colors cursor-pointer"
                                title="Edit service details and pricing"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeleteDialog({ isOpen: true, section: "services", item: service })}
                                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Delete or archive service"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
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
                    className={`rounded-xl border p-4.5 flex flex-col justify-between transition-all shadow-xs ${
                      addon.active
                        ? "bg-[var(--panel-header)] border-[var(--panel-border)] hover:border-[var(--brand-cyan)]/40"
                        : "bg-[var(--panel-bg)]/60 border-[var(--panel-border)] opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-[var(--wa-green)] font-semibold">
                          Add-On
                        </span>

                        {/* Active Toggle */}
                        <button
                          onClick={(e) => handleToggleActive("addons", addon, e)}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer border flex items-center gap-1 ${
                            addon.active
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-neutral-800 text-neutral-400 border-neutral-700"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${addon.active ? "bg-emerald-400" : "bg-neutral-500"}`} />
                          <span>{addon.active ? "Active" : "Inactive"}</span>
                        </button>
                      </div>

                      <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                        {addon.name}
                      </h3>
                      {addon.description && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                          {addon.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--panel-border)] flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--wa-green)]">
                        {formatPriceDisplay(addon)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit("addons", addon)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--panel-active)] text-[var(--text-primary)] hover:bg-[var(--brand-cyan)] hover:text-slate-950 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteDialog({ isOpen: true, section: "addons", item: addon })}
                          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
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
                    className={`rounded-xl border p-4.5 transition-all ${
                      faq.active
                        ? "bg-[var(--panel-header)] border-[var(--panel-border)]"
                        : "bg-[var(--panel-bg)]/60 border-[var(--panel-border)] opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
                        Q: {faq.question}
                      </h3>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {faq.category && (
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[var(--panel-active)] text-[var(--text-muted)]">
                            {faq.category}
                          </span>
                        )}

                        <button
                          onClick={(e) => handleToggleActive("faqs", faq, e)}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer border flex items-center gap-1 ${
                            faq.active
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-neutral-800 text-neutral-400 border-neutral-700"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${faq.active ? "bg-emerald-400" : "bg-neutral-500"}`} />
                          <span>{faq.active ? "Active" : "Inactive"}</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] mt-2 whitespace-pre-wrap leading-relaxed">
                      {faq.answer}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-[var(--panel-border)] flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit("faqs", faq)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--panel-active)] text-[var(--text-primary)] hover:bg-[var(--brand-cyan)] hover:text-slate-950 transition-colors cursor-pointer"
                      >
                        Edit FAQ
                      </button>
                      <button
                        onClick={() => setDeleteDialog({ isOpen: true, section: "faqs", item: faq })}
                        className="p-1 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="max-w-4xl space-y-3">
                {filteredSettings.map((item) => (
                  <div
                    key={item.key}
                    className={`rounded-xl border p-4.5 transition-all ${
                      item.active
                        ? "bg-[var(--panel-header)] border-[var(--panel-border)]"
                        : "bg-[var(--panel-bg)]/60 border-[var(--panel-border)] opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-[var(--brand-cyan)]">
                          {item.key}
                        </span>
                        {item.description && (
                          <span className="text-[11px] text-[var(--text-muted)]">
                            • {item.description}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleToggleActive("settings", item, e)}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer border flex items-center gap-1 ${
                            item.active
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-neutral-800 text-neutral-400 border-neutral-700"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${item.active ? "bg-emerald-400" : "bg-neutral-500"}`} />
                          <span>{item.active ? "Active" : "Inactive"}</span>
                        </button>

                        <button
                          onClick={() => handleOpenEdit("settings", item)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--panel-active)] text-[var(--text-primary)] hover:bg-[var(--brand-cyan)] hover:text-slate-950 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteDialog({ isOpen: true, section: "settings", item })}
                          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <pre className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--search-bg)] p-3 rounded-lg overflow-x-auto border border-[var(--panel-border)] max-h-48">
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

      {/* ========================================================================= */}
      {/* CMS FORM MODAL (Add / Edit) */}
      {/* ========================================================================= */}
      {modalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--panel-border)] bg-[var(--panel-header)] flex items-center justify-between flex-shrink-0">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {modalState.mode === "create" ? "Add New" : "Edit"}{" "}
                {modalState.section === "services"
                  ? "Service / Package"
                  : modalState.section === "addons"
                  ? "Add-On"
                  : modalState.section === "faqs"
                  ? "FAQ"
                  : "Business Fact"}
              </h2>
              <button
                onClick={() => setModalState(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Service Form Fields */}
              {modalState.section === "services" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">
                        Service Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formFields.name || ""}
                        onChange={(e) => setFormFields({ ...formFields, name: e.target.value })}
                        placeholder="e.g. Premium Brand Identity"
                        className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)]"
                      />
                    </div>

                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">
                        Slug / SKU Code
                      </label>
                      <input
                        type="text"
                        value={formFields.slug || ""}
                        onChange={(e) => setFormFields({ ...formFields, slug: e.target.value })}
                        placeholder="e.g. brd-pkg-02"
                        className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--brand-cyan)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Category</label>
                      <input
                        type="text"
                        value={formFields.category || ""}
                        onChange={(e) => setFormFields({ ...formFields, category: e.target.value })}
                        placeholder="e.g. branding, web, marketing"
                        className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)]"
                      />
                    </div>

                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Item Type</label>
                      <select
                        value={formFields.item_type || "service"}
                        onChange={(e) => setFormFields({ ...formFields, item_type: e.target.value })}
                        className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)]"
                      >
                        <option value="service">Individual Service</option>
                        <option value="package">Package / Bundle</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Pricing Model</label>
                      <select
                        value={formFields.pricing_type || "fixed"}
                        onChange={(e) => setFormFields({ ...formFields, pricing_type: e.target.value })}
                        className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)]"
                      >
                        <option value="fixed">Fixed Price</option>
                        <option value="starting_from">Starting From</option>
                        <option value="custom_quote">Custom Quote Only</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {formFields.pricing_type === "fixed" ? (
                      <div>
                        <label className="block text-[var(--text-secondary)] mb-1 font-medium">Fixed Price</label>
                        <input
                          type="number"
                          value={formFields.price ?? ""}
                          onChange={(e) => setFormFields({ ...formFields, price: e.target.value })}
                          placeholder="e.g. 25000"
                          className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)]"
                        />
                      </div>
                    ) : formFields.pricing_type === "starting_from" ? (
                      <div>
                        <label className="block text-[var(--text-secondary)] mb-1 font-medium">Starting Price</label>
                        <input
                          type="number"
                          value={formFields.starting_price ?? ""}
                          onChange={(e) => setFormFields({ ...formFields, starting_price: e.target.value })}
                          placeholder="e.g. 35000"
                          className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)]"
                        />
                      </div>
                    ) : (
                      <div className="text-[var(--text-muted)] italic pt-6">No fixed number (quote only)</div>
                    )}

                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Currency</label>
                      <input
                        type="text"
                        value={formFields.currency || "LKR"}
                        onChange={(e) => setFormFields({ ...formFields, currency: e.target.value })}
                        className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)]"
                      />
                    </div>

                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Billing Unit (Optional)</label>
                      <input
                        type="text"
                        value={formFields.unit || ""}
                        onChange={(e) => setFormFields({ ...formFields, unit: e.target.value })}
                        placeholder="e.g. per month, per page"
                        className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-medium">Description</label>
                    <textarea
                      rows={2}
                      value={formFields.description || ""}
                      onChange={(e) => setFormFields({ ...formFields, description: e.target.value })}
                      placeholder="Summary of what this service covers..."
                      className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-medium">
                      Inclusions / Deliverables (One per line)
                    </label>
                    <textarea
                      rows={3}
                      value={formFields.inclusions || ""}
                      onChange={(e) => setFormFields({ ...formFields, inclusions: e.target.value })}
                      placeholder="Logo Design&#10;Brand Guidelines&#10;Source Files"
                      className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] font-mono text-[11px] focus:outline-none focus:border-[var(--brand-cyan)]"
                    />
                  </div>

                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!formFields.ad_budget_separate}
                        onChange={(e) => setFormFields({ ...formFields, ad_budget_separate: e.target.checked })}
                        className="rounded border-[var(--panel-border)] text-[var(--brand-cyan)] focus:ring-0"
                      />
                      <span className="text-[var(--text-primary)] font-medium">Advertising Budget Separate</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formFields.active !== false}
                        onChange={(e) => setFormFields({ ...formFields, active: e.target.checked })}
                        className="rounded border-[var(--panel-border)] text-emerald-500 focus:ring-0"
                      />
                      <span className="text-[var(--text-primary)] font-medium">Active (Available to AI Agent)</span>
                    </label>
                  </div>
                </>
              )}

              {/* Add-On Form Fields */}
              {modalState.section === "addons" && (
                <>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-medium">Add-On Name *</label>
                    <input
                      type="text"
                      required
                      value={formFields.name || ""}
                      onChange={(e) => setFormFields({ ...formFields, name: e.target.value })}
                      placeholder="e.g. Express 24h Turnaround"
                      className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Pricing Model</label>
                      <select
                        value={formFields.pricing_type || "fixed"}
                        onChange={(e) => setFormFields({ ...formFields, pricing_type: e.target.value })}
                        className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)]"
                      >
                        <option value="fixed">Fixed Price</option>
                        <option value="starting_from">Starting From</option>
                        <option value="custom_quote">Custom Quote</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Price (LKR)</label>
                      <input
                        type="number"
                        value={formFields.pricing_type === "starting_from" ? formFields.starting_price ?? "" : formFields.price ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (formFields.pricing_type === "starting_from") {
                            setFormFields({ ...formFields, starting_price: val });
                          } else {
                            setFormFields({ ...formFields, price: val });
                          }
                        }}
                        className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-medium">Description</label>
                    <textarea
                      rows={2}
                      value={formFields.description || ""}
                      onChange={(e) => setFormFields({ ...formFields, description: e.target.value })}
                      placeholder="Optional details..."
                      className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)]"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={formFields.active !== false}
                      onChange={(e) => setFormFields({ ...formFields, active: e.target.checked })}
                      className="rounded border-[var(--panel-border)] text-emerald-500 focus:ring-0"
                    />
                    <span className="text-[var(--text-primary)] font-medium">Active (Available to AI Agent)</span>
                  </label>
                </>
              )}

              {/* FAQ Form Fields */}
              {modalState.section === "faqs" && (
                <>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-medium">Question *</label>
                    <input
                      type="text"
                      required
                      value={formFields.question || ""}
                      onChange={(e) => setFormFields({ ...formFields, question: e.target.value })}
                      placeholder="e.g. What is the advance payment percentage?"
                      className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-medium">Answer *</label>
                    <textarea
                      rows={4}
                      required
                      value={formFields.answer || ""}
                      onChange={(e) => setFormFields({ ...formFields, answer: e.target.value })}
                      placeholder="BrandHive Studio requires a 50% advance to initiate work..."
                      className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] leading-relaxed focus:outline-none focus:border-[var(--brand-cyan)]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Category</label>
                      <input
                        type="text"
                        value={formFields.category || "general"}
                        onChange={(e) => setFormFields({ ...formFields, category: e.target.value })}
                        placeholder="e.g. pricing, process, hours"
                        className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)]"
                      />
                    </div>

                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Display Order</label>
                      <input
                        type="number"
                        value={formFields.display_order ?? 50}
                        onChange={(e) => setFormFields({ ...formFields, display_order: e.target.value })}
                        className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)]"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={formFields.active !== false}
                      onChange={(e) => setFormFields({ ...formFields, active: e.target.checked })}
                      className="rounded border-[var(--panel-border)] text-emerald-500 focus:ring-0"
                    />
                    <span className="text-[var(--text-primary)] font-medium">Active (Queried by AI FAQ Tool)</span>
                  </label>
                </>
              )}

              {/* Setting / Fact Form Fields */}
              {modalState.section === "settings" && (
                <>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-medium">Key *</label>
                    <input
                      type="text"
                      required
                      disabled={modalState.mode === "edit"}
                      value={formFields.key || ""}
                      onChange={(e) => setFormFields({ ...formFields, key: e.target.value })}
                      placeholder="e.g. business_address"
                      className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--brand-cyan)] disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-medium">Description</label>
                    <input
                      type="text"
                      value={formFields.description || ""}
                      onChange={(e) => setFormFields({ ...formFields, description: e.target.value })}
                      placeholder="e.g. Studio primary location"
                      className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-cyan)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-medium">Value (Text or JSON) *</label>
                    <textarea
                      rows={4}
                      required
                      value={formFields.value || ""}
                      onChange={(e) => setFormFields({ ...formFields, value: e.target.value })}
                      className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl p-3 text-[var(--text-primary)] font-mono text-[11px] focus:outline-none focus:border-[var(--brand-cyan)]"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={formFields.active !== false}
                      onChange={(e) => setFormFields({ ...formFields, active: e.target.checked })}
                      className="rounded border-[var(--panel-border)] text-emerald-500 focus:ring-0"
                    />
                    <span className="text-[var(--text-primary)] font-medium">Active (Queried by AI Tool)</span>
                  </label>
                </>
              )}

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--panel-border)]">
                <button
                  type="button"
                  onClick={() => setModalState(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-[var(--panel-header)] border border-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[var(--brand-cyan)] hover:bg-[var(--brand-cyan-hover)] text-slate-950 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? "Saving..." : modalState.mode === "create" ? "Add to Database" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE / ARCHIVE CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Delete or Archive Record?
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {deleteDialog.item.name || deleteDialog.item.question || deleteDialog.item.key}
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              <strong>Archive</strong> will mark this record inactive so the AI Agent immediately stops offering it, while preserving history in Supabase. <strong>Permanent Delete</strong> will remove it completely from the database.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteDialog(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-medium border border-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDeleteConfirm(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 cursor-pointer"
              >
                Archive (Safe)
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDeleteConfirm(true)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-xs"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
