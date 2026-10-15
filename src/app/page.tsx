"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { AdminNav, type AdminTab } from "@/components/admin-nav";
import { BrandHiveLogo } from "@/components/brandhive-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminKnowledgeView } from "@/components/admin-knowledge-view";
import { AdminBehaviorView } from "@/components/admin-behavior-view";
import { AdminCoexistenceView } from "@/components/admin-coexistence-view";
import { AdminBrandingView } from "@/components/admin-branding-view";
import { ChatMarkdown } from "@/components/chat-markdown";
import { ContactAvatar } from "@/components/contact-avatar";
import { getMessageAttribution } from "@/lib/attribution";
import type { ConversationWithLastMessage, Message } from "@/lib/types";
import {
  mergeMessages,
  isPayloadSanitized,
  getWhatsAppStatusIcon,
} from "@/lib/chat-realtime";

// Quick emoji shortcuts for WhatsApp composer
const QUICK_EMOJIS = ["👋", "👍", "🙏", "😊", "🎉", "💼", "📞", "✨", "❤️", "🔥"];

export default function Dashboard() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  // Active Admin View Tab (instant 0ms client switching)
  const [activeTab, setActiveTab] = useState<AdminTab>("chats");

  const [conversations, setConversations] = useState<ConversationWithLastMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "unread" | "agent" | "human">("all");
  const [userEmail, setUserEmail] = useState<string>("staff@brandhive.io");

  // Track unread conversations from incoming realtime messages
  const [unreadConvos, setUnreadConvos] = useState<Set<string>>(new Set());

  // UI state for dropdown menus & quick emoji tray
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copiedPhoneToast, setCopiedPhoneToast] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  const isNearBottomRef = useRef(true);
  const reconcileTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selected = conversations.find((c) => c.id === selectedId);

  // Fetch logged-in user email
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, [supabase]);

  // Sync tab state from URL params if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as AdminTab;
      if (
        tabParam &&
        ["chats", "knowledge", "behavior", "coexistence", "branding"].includes(tabParam)
      ) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Handle hardware / browser back button on mobile to return to conversation list
  useEffect(() => {
    const handlePopState = () => {
      setSelectedId(null);
      setChatMenuOpen(false);
      setMobileMenuOpen(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {
      // Graceful error handle
    }
  }, []);

  // Keep selectedIdRef in sync with selectedId
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const fetchMessages = useCallback(async (convoId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convoId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => mergeMessages(prev, data));
      }
    } catch {
      // Graceful error handle
    }
  }, []);

  // Debounced message reconciliation for active open conversation
  const triggerReconciliation = useCallback((targetConvoId: string) => {
    if (!targetConvoId) return;
    if (reconcileTimerRef.current) {
      clearTimeout(reconcileTimerRef.current);
    }
    reconcileTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/conversations/${targetConvoId}/messages`);
        if (res.ok) {
          const latestMessages = await res.json();
          if (selectedIdRef.current === targetConvoId) {
            setMessages((prev) => mergeMessages(prev, latestMessages));
          }
        }
      } catch {
        // Graceful error handle
      }
    }, 120);
  }, []);

  // Initial load of conversations
  useEffect(() => {
    let active = true;
    fetch("/api/conversations")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active) setConversations(data);
      });
    return () => {
      active = false;
    };
  }, []);

  // Fetch messages when conversation changes (and clear previous messages to avoid stale display)
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }
    let active = true;
    setLoadingMessages(true);
    fetch(`/api/conversations/${selectedId}/messages`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active) {
          setMessages(data);
          setLoadingMessages(false);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
          }, 40);
        }
      })
      .catch(() => {
        if (active) setLoadingMessages(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  // Scroll to bottom on new messages if user was already near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus textarea when conversation is opened
  useEffect(() => {
    if (selectedId && activeTab === "chats") {
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [selectedId, activeTab]);

  // Auto-resize composer textarea as text is typed
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Realtime Supabase Channel (stable subscription across conversation switches)
  useEffect(() => {
    if (!supabase) return;

    let reconnectTimer: NodeJS.Timeout | null = null;
    let isSubscribed = true;

    function setupChannel() {
      if (!supabase || !isSubscribed) return null;

      const channel = supabase
        .channel("realtime-messages-v2")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          (payload) => {
            const currentId = selectedIdRef.current;
            const newRow = payload.new as Partial<Message> | undefined;

            if (newRow && !isPayloadSanitized(newRow) && newRow.conversation_id) {
              if (newRow.conversation_id === currentId) {
                setMessages((prev) => mergeMessages(prev, [newRow as Message]));
              } else if (newRow.role === "user") {
                setUnreadConvos((prev) => new Set(prev).add(newRow.conversation_id!));
              }
            } else {
              // Sanitized or RLS-protected payload: reconcile active conversation
              if (currentId) {
                triggerReconciliation(currentId);
              }
            }
            fetchConversations();
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "conversations" },
          (payload) => {
            fetchConversations();
            const currentId = selectedIdRef.current;
            const convoPayload = payload.new as { id?: string } | undefined;
            if (currentId && (!convoPayload?.id || convoPayload.id === currentId)) {
              triggerReconciliation(currentId);
            }
          }
        )
        .subscribe((status, error) => {
          if (status === "SUBSCRIBED") {
            if (selectedIdRef.current) {
              triggerReconciliation(selectedIdRef.current);
            }
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn(`Supabase Realtime subscription status: ${status}`, error);
            if (isSubscribed) {
              reconnectTimer = setTimeout(() => {
                supabase?.removeChannel(channel);
                setupChannel();
              }, 3000);
            }
          }
        });

      return channel;
    }

    const channel = setupChannel();

    return () => {
      isSubscribed = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (channel) {
        supabase?.removeChannel(channel);
      }
    };
  }, [supabase, fetchConversations, triggerReconciliation]);

  // Window focus & online reconnection handler (syncs missed messages after sleep/app switch)
  useEffect(() => {
    const handleReconcile = () => {
      fetchConversations();
      if (selectedIdRef.current) {
        triggerReconciliation(selectedIdRef.current);
      }
    };
    window.addEventListener("focus", handleReconcile);
    window.addEventListener("online", handleReconcile);
    return () => {
      window.removeEventListener("focus", handleReconcile);
      window.removeEventListener("online", handleReconcile);
    };
  }, [fetchConversations, triggerReconciliation]);

  // Gentle, visibility-guarded heartbeat: reconciles open conversation every 6s when visible
  useEffect(() => {
    if (!selectedId) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden && selectedIdRef.current) {
        triggerReconciliation(selectedIdRef.current);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [selectedId, triggerReconciliation]);

  // Select conversation handler with mobile history integration
  const handleSelectConversation = (id: string) => {
    if (id !== selectedId) {
      setMessages([]);
    }
    setSelectedId(id);
    selectedIdRef.current = id;
    setUnreadConvos((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setChatMenuOpen(false);
    if (typeof window !== "undefined") {
      window.history.pushState({ selectedId: id }, "");
    }
  };

  // Back to conversation list
  const handleBackToList = () => {
    setSelectedId(null);
    selectedIdRef.current = null;
    setMessages([]);
    setChatMenuOpen(false);
    if (typeof window !== "undefined" && window.history.state?.selectedId) {
      window.history.back();
    }
  };

  async function toggleMode() {
    if (!selected) return;
    const newMode = selected.mode === "agent" ? "human" : "agent";
    await fetch(`/api/conversations/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: newMode }),
    });
    setConversations((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, mode: newMode } : c))
    );
  }

  const handleChatScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    const isNear = distanceFromBottom < 120;
    isNearBottomRef.current = isNear;
    setShowScrollBottom(!isNear);
  };

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    setShowScrollBottom(false);
    isNearBottomRef.current = true;
  };

  async function handleSend() {
    if (!input.trim() || !selectedId || sending) return;
    const textToSend = input.trim();
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${selectedId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Failed to send message via WhatsApp. Please check connectivity or WhatsApp Business status.");
        return;
      }
      setInput("");
      setShowEmojiPicker(false);
      scrollToBottom(true);
      fetchMessages(selectedId);
    } catch {
      alert("Network error: Could not reach server to send WhatsApp message.");
    } finally {
      setSending(false);
    }
  }

  function handleInsertEmoji(emoji: string) {
    setInput((prev) => prev + emoji);
    textareaRef.current?.focus();
  }

  function handleCopyPhone(phone: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(phone);
      setCopiedPhoneToast(true);
      setTimeout(() => setCopiedPhoneToast(false), 2000);
    }
  }

  // Format timestamp for conversation list (WhatsApp Web style)
  function formatListTime(dateStr: string) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return "Yesterday";

    // Within last 6 days: show day of week
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }

    return date.toLocaleDateString([], { month: "numeric", day: "numeric", year: "2-digit" });
  }

  // Format timestamp for message bubbles
  function formatBubbleTime(dateStr: string) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Format date divider for chat messages
  function formatDateDivider(dateStr: string) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    if (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    ) {
      return "TODAY";
    }
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    ) {
      return "YESTERDAY";
    }
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).toUpperCase();
  }



  // Filtered Conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.phone.includes(searchQuery.trim());

      let matchesFilter = true;
      if (filterMode === "unread") {
        matchesFilter = unreadConvos.has(c.id);
      } else if (filterMode === "agent") {
        matchesFilter = c.mode === "agent";
      } else if (filterMode === "human") {
        matchesFilter = c.mode === "human";
      }

      return matchesSearch && matchesFilter;
    });
  }, [conversations, searchQuery, filterMode, unreadConvos]);

  return (
    <div className="flex h-screen w-full bg-[var(--app-bg)] text-[var(--text-primary)] font-sans overflow-hidden">
      {/* Primary WhatsApp Left Navigation Rail (Desktop) */}
      <AdminNav
        userEmail={userEmail}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setMobileMenuOpen(false);
        }}
      />

      {/* View Switcher: Seamless 0ms Navigation */}
      {activeTab === "knowledge" ? (
        <main className="flex-1 flex flex-col min-w-0 bg-[var(--panel-bg)] overflow-hidden">
          {/* Back to Chats Header */}
          <div className="px-4 md:px-6 py-2.5 border-b border-[var(--panel-border)] bg-[var(--panel-header)] flex items-center justify-between flex-shrink-0">
            <button
              onClick={() => {
                setActiveTab("chats");
                window.history.pushState(null, "", "/");
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg text-[var(--wa-green)] bg-[var(--panel-bg)] border border-[var(--panel-border)] hover:bg-[var(--panel-active)] transition-all cursor-pointer shadow-2xs"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m15 18-6-6 6-6" />
              </svg>
              <span>Back to WhatsApp Inbox</span>
            </button>
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              AI Knowledge Catalog
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <AdminKnowledgeView />
          </div>
        </main>
      ) : activeTab === "behavior" ? (
        <main className="flex-1 flex flex-col min-w-0 bg-[var(--panel-bg)] overflow-hidden">
          <header className="px-4 md:px-6 py-3 border-b border-[var(--panel-border)] bg-[var(--panel-header)] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveTab("chats");
                  window.history.pushState(null, "", "/");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-[var(--wa-green)] bg-[var(--panel-bg)] border border-[var(--panel-border)] hover:bg-[var(--panel-active)] transition-all cursor-pointer shadow-2xs"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                <span>Back to Chats</span>
              </button>
              <div>
                <h1 className="text-base font-semibold text-[var(--text-primary)] leading-tight">
                  AI Conversation Behavior
                </h1>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Configure tone, friendliness, pacing, and personality.
                </p>
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <AdminBehaviorView />
          </div>
        </main>
      ) : activeTab === "coexistence" ? (
        <main className="flex-1 flex flex-col min-w-0 bg-[var(--panel-bg)] overflow-hidden">
          <header className="px-4 md:px-6 py-3 border-b border-[var(--panel-border)] bg-[var(--panel-header)] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveTab("chats");
                  window.history.pushState(null, "", "/");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-[var(--wa-green)] bg-[var(--panel-bg)] border border-[var(--panel-border)] hover:bg-[var(--panel-active)] transition-all cursor-pointer shadow-2xs"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                <span>Back to Chats</span>
              </button>
              <div>
                <h1 className="text-base font-semibold text-[var(--text-primary)] leading-tight">
                  WhatsApp Business App Coexistence
                </h1>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Meta Embedded Signup & Cloud API onboarding portal.
                </p>
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <AdminCoexistenceView />
          </div>
        </main>
      ) : activeTab === "branding" ? (
        <main className="flex-1 flex flex-col min-w-0 bg-[var(--panel-bg)] overflow-hidden">
          <header className="px-4 md:px-6 py-3 border-b border-[var(--panel-border)] bg-[var(--panel-header)] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveTab("chats");
                  window.history.pushState(null, "", "/");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-[var(--wa-green)] bg-[var(--panel-bg)] border border-[var(--panel-border)] hover:bg-[var(--panel-active)] transition-all cursor-pointer shadow-2xs"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                <span>Back to Chats</span>
              </button>
              <div>
                <h1 className="text-base font-semibold text-[var(--text-primary)] leading-tight">
                  Logo & Branding Settings
                </h1>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Customize the active logo displayed throughout the WhatsApp AI Agent Admin portal.
                </p>
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-6">
            <AdminBrandingView />
          </div>
        </main>
      ) : (
        /* Chats View (WhatsApp Web-Inspired Dual-Pane Layout) */
        <div className="flex-1 flex min-w-0 h-full overflow-hidden relative">
          {/* Toast Notification */}
          {copiedPhoneToast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[var(--panel-active)] text-xs font-semibold border border-[var(--panel-border)] shadow-md flex items-center gap-2">
              <span className="text-[var(--wa-green)]">✓</span>
              <span>Phone number copied to clipboard</span>
            </div>
          )}

          {/* Conversation List Sidebar */}
          <aside
            className={`w-full md:w-[380px] lg:w-[420px] flex-shrink-0 flex flex-col border-r border-[var(--panel-border)] bg-[var(--panel-bg)] transition-all ${
              selectedId ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Sidebar Top Header (WhatsApp Web authentic 60px header) */}
            <div className="h-[60px] px-4 border-b border-[var(--panel-border)] bg-[var(--panel-header)] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <BrandHiveLogo size={36} showText={true} subtext="WhatsApp Agent" />
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                {/* AI Catalog Shortcut */}
                <button
                  onClick={() => setActiveTab("knowledge")}
                  className="px-2.5 py-1 text-xs rounded-lg font-medium bg-[var(--panel-active)] text-[var(--wa-green)] hover:opacity-85 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="View authoritative AI Knowledge Catalog"
                >
                  <span>AI Catalog</span>
                </button>

                {/* Mobile Overflow Menu Button (WhatsApp Android 3 dots) */}
                <div className="relative">
                  <button
                    onClick={() => setMobileMenuOpen((prev) => !prev)}
                    className="p-2 rounded-full hover:bg-[var(--panel-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    aria-label="Menu"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {mobileMenuOpen && (
                    <div className="absolute right-0 top-11 w-52 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl shadow-xl py-1.5 z-50 text-xs text-[var(--text-primary)]">
                      <button
                        onClick={() => {
                          setActiveTab("knowledge");
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[var(--panel-hover)] flex items-center gap-2 cursor-pointer"
                      >
                        <span>📚</span> AI Knowledge Catalog
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab("behavior");
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[var(--panel-hover)] flex items-center gap-2 cursor-pointer"
                      >
                        <span>⚙️</span> AI Behavior & Tone
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab("coexistence");
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[var(--panel-hover)] flex items-center gap-2 cursor-pointer"
                      >
                        <span>📱</span> WhatsApp Coexistence
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab("branding");
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[var(--panel-hover)] flex items-center gap-2 cursor-pointer"
                      >
                        <span>🎨</span> BrandHive Logo Settings
                      </button>
                      <div className="my-1 border-t border-[var(--panel-border)]" />
                      <div className="px-4 py-2 flex items-center justify-between text-[var(--text-secondary)]">
                        <span>Theme</span>
                        <ThemeToggle />
                      </div>
                      <div className="my-1 border-t border-[var(--panel-border)]" />
                      <button
                        onClick={async () => {
                          await fetch("/api/auth/signout", { method: "POST" });
                          window.location.href = "/login";
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-red-500/10 text-red-500 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <span>🚪</span> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="p-2.5 border-b border-[var(--panel-border)] bg-[var(--panel-bg)] space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search or start new chat"
                  className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg bg-[var(--search-bg)] text-[var(--text-primary)] placeholder-[var(--text-muted)] border border-transparent focus:border-[var(--brand-cyan)] focus:outline-none transition-colors"
                />
                <svg
                  className="absolute left-3 top-2 text-[var(--text-muted)]"
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
                    className="absolute right-2.5 top-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto pb-0.5 no-scrollbar">
                <button
                  onClick={() => setFilterMode("all")}
                  className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer flex-shrink-0 ${
                    filterMode === "all"
                      ? "bg-[var(--wa-green)] text-white"
                      : "bg-[var(--search-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterMode("unread")}
                  className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer flex-shrink-0 flex items-center gap-1 ${
                    filterMode === "unread"
                      ? "bg-[var(--wa-green)] text-white"
                      : "bg-[var(--search-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span>Unread</span>
                  {unreadConvos.size > 0 && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                        filterMode === "unread"
                          ? "bg-white text-[var(--wa-green)] font-bold"
                          : "bg-[var(--unread-badge)] text-white"
                      }`}
                    >
                      {unreadConvos.size}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setFilterMode("agent")}
                  className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer flex-shrink-0 ${
                    filterMode === "agent"
                      ? "bg-[var(--wa-green)] text-white"
                      : "bg-[var(--search-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  🤖 AI Auto
                </button>
                <button
                  onClick={() => setFilterMode("human")}
                  className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer flex-shrink-0 ${
                    filterMode === "human"
                      ? "bg-amber-600 text-white"
                      : "bg-[var(--search-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  👤 Human Takeover
                </button>
              </div>
            </div>

            {/* Conversation List Rows */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--panel-border)]/50">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--search-bg)] flex items-center justify-center text-[var(--text-muted)] mb-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">No chats found</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    {searchQuery
                      ? "Try searching for a different name or phone number."
                      : "Customer messages received on WhatsApp will appear here."}
                  </p>
                </div>
              ) : (
                filteredConversations.map((convo) => {
                  const isSelected = selectedId === convo.id;
                  const isUnread = unreadConvos.has(convo.id);

                  return (
                    <button
                      key={convo.id}
                      onClick={() => handleSelectConversation(convo.id)}
                      className={`w-full text-left px-3.5 py-3 transition-colors relative flex items-center gap-3.5 cursor-pointer ${
                        isSelected
                          ? "bg-[var(--panel-active)]"
                          : "hover:bg-[var(--panel-hover)]"
                      }`}
                    >
                      {/* Avatar */}
                      <ContactAvatar
                        name={convo.name}
                        phone={convo.phone}
                        size="lg"
                        showStatusBadge={true}
                        mode={convo.mode}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-1">
                        {/* Top Line: Name and Time */}
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={`text-[15px] truncate leading-tight ${
                              isUnread
                                ? "font-bold text-[var(--text-primary)]"
                                : "font-medium text-[var(--text-primary)]"
                            }`}
                          >
                            {convo.name || convo.phone}
                          </span>
                          <span
                            className={`text-[11px] flex-shrink-0 ${
                              isUnread
                                ? "text-[var(--wa-green)] font-semibold"
                                : "text-[var(--text-muted)]"
                            }`}
                          >
                            {formatListTime(convo.updated_at)}
                          </span>
                        </div>

                        {/* Bottom Line: Preview and Status */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            {/* Checkmark icon if last message was assistant */}
                            {convo.last_message && (
                              <span className="text-[var(--ticks-read)] text-xs flex-shrink-0" title="Delivered">
                                ✓✓
                              </span>
                            )}
                            <p
                              className={`text-[13px] truncate ${
                                isUnread
                                  ? "text-[var(--text-primary)] font-semibold"
                                  : "text-[var(--text-secondary)]"
                              }`}
                            >
                              {convo.last_message || (
                                <span className="italic text-[var(--text-muted)]">No messages yet</span>
                              )}
                            </p>
                          </div>

                          {/* Unread dot or Mode Badge */}
                          {isUnread ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-[var(--unread-badge)] flex-shrink-0" />
                          ) : (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium uppercase tracking-wider flex-shrink-0 ${
                                convo.mode === "agent"
                                  ? "bg-[var(--wa-green-badge)] text-[var(--wa-green-badge-text)]"
                                  : "bg-amber-500/15 text-amber-500"
                              }`}
                            >
                              {convo.mode === "agent" ? "AI" : "Staff"}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Active Chat Panel Canvas */}
          <main
            className={`flex-1 flex flex-col min-w-0 h-full bg-[var(--chat-bg)] ${
              !selectedId ? "hidden md:flex" : "flex"
            }`}
          >
            {!selected ? (
              /* WhatsApp Web Desktop Empty Hero */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none whatsapp-chat-wallpaper">
                <div className="max-w-md flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-[var(--panel-bg)] border border-[var(--panel-border)] shadow-md flex items-center justify-center mb-6">
                    <BrandHiveLogo size={48} />
                  </div>
                  <h2 className="text-xl font-normal text-[var(--text-primary)] tracking-tight">
                    BrandHive Studio for WhatsApp
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-3 leading-relaxed max-w-sm">
                    Send and receive WhatsApp customer messages in real-time. Gemini AI automatically answers inquiries, explains services, and provides official pricing.
                  </p>
                  <div className="mt-8 pt-6 border-t border-[var(--panel-border)]/60 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>End-to-end encrypted with WhatsApp Cloud API</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Active Chat Conversation */
              <div className="flex-1 flex flex-col min-w-0 h-full">
                {/* Header: WhatsApp Web 60px header */}
                <header className="h-[60px] px-4 border-b border-[var(--panel-border)] bg-[var(--panel-header)] flex items-center justify-between flex-shrink-0 z-10">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile Back Button (Android-inspired back arrow) */}
                    <button
                      onClick={handleBackToList}
                      className="md:hidden p-1.5 -ml-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--panel-hover)] cursor-pointer"
                      aria-label="Back to chat list"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </button>

                    {/* Avatar */}
                    <ContactAvatar
                      name={selected.name}
                      phone={selected.phone}
                      size="md"
                      showStatusBadge={true}
                      mode={selected.mode}
                    />

                    {/* Contact Info */}
                    <div className="min-w-0">
                      <h2 className="text-[15px] font-medium text-[var(--text-primary)] truncate leading-tight">
                        {selected.name || selected.phone}
                      </h2>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] truncate">
                        <span>{selected.phone}</span>
                        <span>•</span>
                        <span
                          className={`font-medium ${
                            selected.mode === "agent"
                              ? "text-[var(--wa-green)]"
                              : "text-amber-500"
                          }`}
                        >
                          {selected.mode === "agent" ? "🤖 AI Auto-Reply" : "👤 Human Takeover"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2">
                    {/* AI / Human Mode Toggle Pill */}
                    <button
                      onClick={toggleMode}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border cursor-pointer shadow-2xs ${
                        selected.mode === "agent"
                          ? "bg-[var(--wa-green-badge)] text-[var(--wa-green-badge-text)] border-[var(--wa-green)]/30 hover:opacity-90"
                          : "bg-amber-500/15 text-amber-500 border-amber-500/30 hover:bg-amber-500/25"
                      }`}
                      title={
                        selected.mode === "agent"
                          ? "AI Auto-Reply active: Gemini answers incoming messages. Click to take over."
                          : "Human Takeover active: AI replies paused. Click to hand back to AI."
                      }
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          selected.mode === "agent"
                            ? "bg-[var(--wa-green)] animate-pulse"
                            : "bg-amber-500"
                        }`}
                      />
                      <span className="hidden sm:inline">
                        {selected.mode === "agent" ? "AI Auto" : "Human"}
                      </span>
                      <span className="text-[10px] opacity-75 font-normal">
                        ({selected.mode === "agent" ? "Take Over" : "Resume AI"})
                      </span>
                    </button>

                    {/* Chat Three-dot Menu */}
                    <div className="relative">
                      <button
                        onClick={() => setChatMenuOpen((prev) => !prev)}
                        className="p-2 rounded-full hover:bg-[var(--panel-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        aria-label="Chat options"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>

                      {/* Dropdown */}
                      {chatMenuOpen && (
                        <div className="absolute right-0 top-11 w-48 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl shadow-xl py-1.5 z-50 text-xs text-[var(--text-primary)]">
                          <button
                            onClick={() => {
                              toggleMode();
                              setChatMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] flex items-center gap-2 cursor-pointer"
                          >
                            <span>{selected.mode === "agent" ? "👤" : "🤖"}</span>
                            <span>{selected.mode === "agent" ? "Switch to Human" : "Resume AI Auto"}</span>
                          </button>
                          <button
                            onClick={() => {
                              handleCopyPhone(selected.phone);
                              setChatMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] flex items-center gap-2 cursor-pointer"
                          >
                            <span>📋</span>
                            <span>Copy Phone Number</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab("knowledge");
                              setChatMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] flex items-center gap-2 cursor-pointer"
                          >
                            <span>📚</span>
                            <span>Check AI Catalog</span>
                          </button>
                          <div className="my-1 border-t border-[var(--panel-border)]" />
                          <button
                            onClick={handleBackToList}
                            className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] text-[var(--text-secondary)] flex items-center gap-2 cursor-pointer"
                          >
                            <span>✕</span>
                            <span>Close Chat</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </header>

                {/* Chat Message Stream */}
                <div
                  ref={chatScrollContainerRef}
                  onScroll={handleChatScroll}
                  onClick={() => {
                    setChatMenuOpen(false);
                    setShowEmojiPicker(false);
                  }}
                  className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-12 py-4 space-y-2.5 whatsapp-chat-wallpaper relative"
                >
                  {/* Security Banner */}
                  <div className="flex justify-center my-2">
                    <span className="px-3.5 py-1.5 rounded-lg bg-[var(--panel-header)]/90 backdrop-blur-xs text-[11px] text-[var(--text-secondary)] shadow-2xs border border-[var(--panel-border)]/40 flex items-center gap-1.5 select-none text-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span>Messages and calls are end-to-end encrypted with WhatsApp Cloud API.</span>
                    </span>
                  </div>

                  {loadingMessages && messages.length === 0 ? (
                    /* Loading Skeleton (WhatsApp Web staggered bubbles) */
                    <div className="space-y-4 py-4 animate-pulse">
                      <div className="flex justify-start">
                        <div className="h-12 w-48 bg-[var(--panel-border)]/50 rounded-2xl rounded-tl-sm" />
                      </div>
                      <div className="flex justify-end">
                        <div className="h-16 w-64 bg-[var(--panel-border)]/50 rounded-2xl rounded-tr-sm" />
                      </div>
                      <div className="flex justify-start">
                        <div className="h-10 w-40 bg-[var(--panel-border)]/50 rounded-2xl rounded-tl-sm" />
                      </div>
                      <div className="flex justify-end">
                        <div className="h-14 w-56 bg-[var(--panel-border)]/50 rounded-2xl rounded-tr-sm" />
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-center">
                      <span className="px-3.5 py-1.5 rounded-lg bg-[var(--panel-header)]/80 text-xs text-[var(--text-secondary)] shadow-2xs">
                        No messages yet in this conversation.
                      </span>
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const isUser = msg.role === "user";
                      const isAssistant = msg.role === "assistant";
                      const attr = getMessageAttribution(msg);

                      // Date separator check
                      const prevMsg = i > 0 ? messages[i - 1] : null;
                      const showDateDivider =
                        !prevMsg ||
                        formatDateDivider(msg.created_at) !== formatDateDivider(prevMsg.created_at);

                      return (
                        <React.Fragment key={msg.id || i}>
                          {showDateDivider && (
                            <div className="flex justify-center my-3 select-none">
                              <span className="px-3 py-1 rounded-md bg-[var(--panel-header)]/90 backdrop-blur-xs text-[11px] font-semibold text-[var(--text-secondary)] shadow-2xs uppercase tracking-wider">
                                {formatDateDivider(msg.created_at)}
                              </span>
                            </div>
                          )}

                          <div className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
                            <div
                              className={`relative max-w-[85%] sm:max-w-[72%] md:max-w-[65%] px-3.5 py-2.5 rounded-2xl shadow-xs leading-relaxed text-[14px] ${
                                isUser
                                  ? "bg-[var(--bubble-in)] text-[var(--bubble-in-text)] rounded-tl-sm border border-[var(--bubble-in-border)]"
                                  : "bg-[var(--bubble-out)] text-[var(--bubble-out-text)] rounded-tr-sm"
                              }`}
                            >
                              {/* Attribution Badge for Outbound Assistant / Staff / AI messages */}
                              {isAssistant && attr.badgeLabel && (
                                <div
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold mb-1 uppercase tracking-wider select-none ${
                                    attr.badgeStyle === "ai"
                                      ? "bg-[var(--wa-green)]/15 text-[var(--wa-green)]"
                                      : attr.badgeStyle === "coexistence"
                                      ? "bg-amber-500/15 text-amber-500 dark:text-amber-400"
                                      : attr.badgeStyle === "staff"
                                      ? "bg-sky-500/15 text-sky-500 dark:text-sky-400"
                                      : "bg-zinc-500/15 text-[var(--text-secondary)]"
                                  }`}
                                  title={attr.description}
                                >
                                  <span>{attr.badgeIcon}</span>
                                  <span>{attr.badgeLabel}</span>
                                </div>
                              )}

                              {/* Media attachment display if present */}
                              {msg.whatsapp_type === "image" && msg.media_url && (
                                <div className="mb-2 rounded-lg overflow-hidden border border-black/10 dark:border-white/10">
                                  <img
                                    src={msg.media_url}
                                    alt="WhatsApp Media"
                                    className="max-h-64 w-auto rounded-lg object-contain cursor-pointer hover:opacity-95 transition-opacity"
                                    onClick={() => window.open(msg.media_url!, "_blank")}
                                  />
                                </div>
                              )}
                              {msg.whatsapp_type === "document" && (
                                <div className="mb-2 p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center gap-2.5">
                                  <span className="text-xl">📄</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate">Document</p>
                                    {msg.media_url && (
                                      <a
                                        href={msg.media_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] text-sky-500 hover:underline truncate block"
                                      >
                                        View / Download
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}
                              {msg.whatsapp_type === "audio" && (
                                <div className="mb-2 p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center gap-2">
                                  <span className="text-xl">🎙️</span>
                                  <span className="text-xs text-[var(--text-secondary)]">Voice note</span>
                                  {msg.media_url && (
                                    <audio controls src={msg.media_url} className="h-8 max-w-[200px]" />
                                  )}
                                </div>
                              )}

                              {/* Message Text with WhatsApp & Markdown support */}
                              <ChatMarkdown content={msg.content} />

                              {/* Timestamp and Double Checkmark */}
                              <div className="flex items-center justify-end gap-1 mt-1 -mb-0.5 text-[11px] text-[var(--bubble-time)] select-none">
                                <span>{formatBubbleTime(msg.created_at)}</span>
                                {isAssistant && (() => {
                                  const icon = getWhatsAppStatusIcon(msg.wa_status);
                                  return (
                                    <span
                                      className={icon.className}
                                      title={icon.title}
                                    >
                                      {icon.symbol}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Floating Scroll-to-Bottom Button */}
                {showScrollBottom && (
                  <button
                    onClick={() => scrollToBottom(true)}
                    className="absolute bottom-20 right-6 z-20 w-10 h-10 rounded-full bg-[var(--panel-bg)] hover:bg-[var(--panel-hover)] text-[var(--text-primary)] border border-[var(--panel-border)] shadow-lg flex items-center justify-center transition-all cursor-pointer hover:scale-105"
                    title="Scroll to bottom"
                    aria-label="Scroll to bottom"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                )}

                {/* Emoji Quick Tray (WhatsApp Web inspired) */}
                {showEmojiPicker && (
                  <div className="px-4 py-2 border-t border-[var(--panel-border)] bg-[var(--panel-header)] flex items-center gap-3 overflow-x-auto z-20">
                    <span className="text-[11px] font-medium text-[var(--text-secondary)] flex-shrink-0">
                      Quick Emoji:
                    </span>
                    <div className="flex items-center gap-2">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleInsertEmoji(emoji)}
                          className="w-8 h-8 rounded-lg hover:bg-[var(--panel-hover)] flex items-center justify-center text-lg transition-transform hover:scale-110 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Composer (WhatsApp Web authentic style) */}
                <footer className="px-3 md:px-4 py-2.5 border-t border-[var(--panel-border)] bg-[var(--panel-header)] flex items-center gap-2 flex-shrink-0 relative">
                  {/* Emoji Button */}
                  <button
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--panel-hover)] transition-colors cursor-pointer"
                    title="Insert emoji"
                    aria-label="Insert emoji"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                      <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
                      <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
                    </svg>
                  </button>

                  {/* Attachment Icon */}
                  <button
                    onClick={() => {
                      alert("WhatsApp Cloud API supports text messages, links, and documents. Direct media upload can be sent via WhatsApp Business.");
                    }}
                    className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--panel-hover)] transition-colors cursor-pointer"
                    title="Attach document or media"
                    aria-label="Attach"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                  </button>

                  {/* Input Field */}
                  <div className="flex-1 bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3.5 py-2 focus-within:border-[var(--brand-cyan)] transition-colors min-h-[42px] max-h-[120px] flex items-center">
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={
                        selected.mode === "agent"
                          ? "Type a manual reply (switches to Human mode)..."
                          : "Type a message..."
                      }
                      className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none resize-none leading-relaxed max-h-[110px] overflow-y-auto"
                    />
                  </div>

                  {/* Dynamic Action Button: Send or Mic */}
                  {input.trim() ? (
                    <button
                      onClick={handleSend}
                      disabled={sending}
                      className="w-10 h-10 rounded-full bg-[var(--wa-green)] hover:bg-[var(--wa-green-hover)] text-white disabled:opacity-40 transition-all flex items-center justify-center shadow-xs flex-shrink-0 cursor-pointer"
                      aria-label="Send WhatsApp message"
                      title="Send WhatsApp message"
                    >
                      {sending ? (
                        <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => inputRef.current?.focus()}
                      className="w-10 h-10 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel-hover)] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                      title="Voice message supported via WhatsApp Business"
                      aria-label="Voice message"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="22" />
                      </svg>
                    </button>
                  )}
                </footer>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
