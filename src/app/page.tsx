"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { AdminNav } from "@/components/admin-nav";
import { BrandHiveLogo } from "@/components/brandhive-logo";
import type { ConversationWithLastMessage, Message } from "@/lib/types";

export default function Dashboard() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [conversations, setConversations] = useState<ConversationWithLastMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "agent" | "human">("all");
  const [userEmail, setUserEmail] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = conversations.find((c) => c.id === selectedId);

  // Fetch logged-in user email
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, [supabase]);

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

  const fetchMessages = useCallback(async (convoId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convoId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {
      // Graceful error handle
    }
  }, []);

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

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    fetch(`/api/conversations/${selectedId}/messages`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active) setMessages(data);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when conversation changes
  useEffect(() => {
    if (selectedId) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [selectedId]);

  // Realtime Supabase Channel
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.conversation_id === selectedId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [selectedId, fetchConversations, supabase]);

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

  async function handleSend() {
    if (!input.trim() || !selectedId || sending) return;
    setSending(true);
    try {
      await fetch(`/api/conversations/${selectedId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.trim() }),
      });
      setInput("");
      fetchMessages(selectedId);
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateStr: string) {
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
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function getInitials(name: string | null, phone: string) {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    return phone.slice(-2);
  }

  // Filtered Conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.phone.includes(searchQuery.trim());

      const matchesMode =
        filterMode === "all" || c.mode === filterMode;

      return matchesSearch && matchesMode;
    });
  }, [conversations, searchQuery, filterMode]);

  return (
    <div className="flex h-screen w-full bg-[var(--app-bg)] text-[var(--text-primary)] font-sans overflow-hidden">
      {/* Primary WhatsApp Navigation Rail */}
      <AdminNav userEmail={userEmail} />

      {/* Main Inbox Container */}
      <div className="flex-1 flex min-w-0 h-full overflow-hidden">
        {/* Conversation List Sidebar */}
        <aside
          className={`w-full md:w-[360px] lg:w-[400px] flex-shrink-0 flex flex-col border-r border-[var(--panel-border)] bg-[var(--panel-bg)] ${
            selectedId ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Sidebar Header */}
          <div className="px-4 py-3 border-b border-[var(--panel-border)] bg-[var(--panel-header)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandHiveLogo size={36} showText={true} subtext={`${conversations.length} chats`} />
            </div>

            {/* Quick Link to Knowledge */}
            <Link
              href="/admin/knowledge"
              className="px-2.5 py-1 text-xs rounded-lg font-medium bg-[var(--panel-active)] text-[var(--wa-green)] hover:opacity-85 transition-all flex items-center gap-1.5"
              title="View authoritative AI Knowledge Catalog"
            >
              <span>AI Catalog</span>
            </Link>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-3 border-b border-[var(--panel-border)] bg-[var(--panel-bg)] space-y-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or phone..."
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

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <button
                onClick={() => setFilterMode("all")}
                className={`px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                  filterMode === "all"
                    ? "bg-[var(--wa-green)] text-white"
                    : "bg-[var(--search-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode("agent")}
                className={`px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                  filterMode === "agent"
                    ? "bg-[var(--wa-green)] text-white"
                    : "bg-[var(--search-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                🤖 AI Auto
              </button>
              <button
                onClick={() => setFilterMode("human")}
                className={`px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                  filterMode === "human"
                    ? "bg-amber-600 text-white"
                    : "bg-[var(--search-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                👤 Human
              </button>
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--panel-border)]/50">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-56 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--search-bg)] flex items-center justify-center text-[var(--text-muted)] mb-2">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-[var(--text-secondary)]">No conversations found</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Incoming WhatsApp messages will appear here in real-time.
                </p>
              </div>
            ) : (
              filteredConversations.map((convo) => {
                const isSelected = selectedId === convo.id;
                return (
                  <button
                    key={convo.id}
                    onClick={() => setSelectedId(convo.id)}
                    className={`w-full text-left px-3.5 py-3 transition-colors relative flex items-center gap-3 group ${
                      isSelected
                        ? "bg-[var(--panel-active)]"
                        : "hover:bg-[var(--panel-hover)]"
                    }`}
                  >
                    {/* Active Bar Indicator */}
                    {isSelected && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--wa-green)]" />
                    )}

                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                        {getInitials(convo.name, convo.phone)}
                      </div>
                      {convo.mode === "agent" ? (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--panel-bg)] flex items-center justify-center text-[10px]"
                          title="AI Agent Active"
                        >
                          🤖
                        </span>
                      ) : (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--panel-bg)] flex items-center justify-center text-[10px]"
                          title="Human Mode Active"
                        >
                          👤
                        </span>
                      )}
                    </div>

                    {/* Conversation Meta & Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {convo.name || convo.phone}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">
                          {formatTime(convo.updated_at)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-[var(--text-secondary)] truncate flex-1">
                          {convo.last_message || <span className="italic text-[var(--text-muted)]">No messages yet</span>}
                        </p>

                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium uppercase tracking-wider flex-shrink-0 ${
                            convo.mode === "agent"
                              ? "bg-[var(--wa-green-badge)] text-[var(--wa-green-badge-text)]"
                              : "bg-amber-500/15 text-amber-500"
                          }`}
                        >
                          {convo.mode === "agent" ? "AI" : "You"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Chat Panel Canvas */}
        <main className={`flex-1 flex flex-col min-w-0 h-full bg-[var(--chat-bg)] ${
          !selectedId ? "hidden md:flex" : "flex"
        }`}>
          {!selected ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center select-none whatsapp-chat-wallpaper">
              <div className="p-4 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] shadow-md">
                <BrandHiveLogo size={64} />
              </div>
              <div className="max-w-sm">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  BrandHive WhatsApp Business Inbox
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  Select a conversation from the sidebar to view chat history, monitor Gemini AI auto-replies, or take over in Human mode.
                </p>
              </div>
            </div>
          ) : (
            /* Active Chat View */
            <div className="flex-1 flex flex-col min-w-0 h-full">
              {/* Chat Header */}
              <header className="px-5 py-3 border-b border-[var(--panel-border)] bg-[var(--panel-header)] flex items-center justify-between flex-shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setSelectedId(null)}
                    className="md:hidden p-1.5 -ml-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    aria-label="Back to conversations"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>

                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white text-xs font-semibold shadow-sm flex-shrink-0">
                    {getInitials(selected.name, selected.phone)}
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {selected.name || selected.phone}
                    </h2>
                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                      <span>{selected.phone}</span>
                      <span>•</span>
                      <span className="text-[var(--wa-green)] font-medium">
                        {selected.mode === "agent" ? "AI Enabled" : "Human Control"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI / Human Mode Switcher */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMode}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border shadow-xs ${
                      selected.mode === "agent"
                        ? "bg-[var(--wa-green-badge)] text-[var(--wa-green-badge-text)] border-[var(--wa-green)]/30 hover:opacity-90"
                        : "bg-amber-500/15 text-amber-500 border-amber-500/30 hover:bg-amber-500/25"
                    }`}
                    title={
                      selected.mode === "agent"
                        ? "AI Mode: Gemini auto-replies to incoming messages. Click to switch to Human mode."
                        : "Human Mode: AI replies are paused. Click to hand back to AI."
                    }
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        selected.mode === "agent"
                          ? "bg-[var(--wa-green)] animate-pulse"
                          : "bg-amber-500"
                      }`}
                    />
                    <span>{selected.mode === "agent" ? "🤖 AI Auto-Reply" : "👤 Human Takeover"}</span>
                  </button>
                </div>
              </header>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-3 whatsapp-chat-wallpaper">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-center">
                    <span className="px-3.5 py-1.5 rounded-lg bg-[var(--panel-bg)]/80 backdrop-blur-sm border border-[var(--panel-border)] text-xs text-[var(--text-secondary)] shadow-sm">
                      End-to-end encrypted WhatsApp conversation
                    </span>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isUser = msg.role === "user";
                    const isAssistant = msg.role === "assistant";

                    return (
                      <div
                        key={msg.id || i}
                        className={`flex ${isUser ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`relative max-w-[85%] sm:max-w-[70%] md:max-w-[62%] px-3.5 py-2.5 rounded-2xl shadow-sm leading-relaxed text-sm ${
                            isUser
                              ? "bg-[var(--bubble-in)] text-[var(--bubble-in-text)] rounded-tl-xs border border-[var(--bubble-in-border)]"
                              : "bg-[var(--bubble-out)] text-[var(--bubble-out-text)] rounded-tr-xs"
                          }`}
                        >
                          {/* Assistant Tag */}
                          {isAssistant && (
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-[var(--wa-green)] mb-1 uppercase tracking-wider">
                              <span>🤖 BrandHive AI</span>
                            </div>
                          )}

                          {/* Message Body */}
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                          {/* Timestamp & Delivery Receipt */}
                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[var(--bubble-time)] select-none">
                            <span>{formatTime(msg.created_at)}</span>
                            {isAssistant && (
                              <span
                                className="text-sky-500 font-bold"
                                title="Delivered via WhatsApp"
                              >
                                ✓✓
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <footer className="px-4 md:px-6 py-3 border-t border-[var(--panel-border)] bg-[var(--panel-header)] flex items-center gap-2 flex-shrink-0">
                <div className="flex-1 flex items-center gap-2 bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-2xl px-3.5 py-2 focus-within:border-[var(--wa-green)] shadow-xs transition-colors">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder={
                      selected.mode === "agent"
                        ? "Type a manual reply (switches to Human mode)..."
                        : "Type a reply to customer..."
                    }
                    className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                  />
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="w-10 h-10 rounded-full bg-[var(--wa-green)] hover:bg-[var(--wa-green-hover)] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm flex-shrink-0"
                  aria-label="Send WhatsApp message"
                >
                  {sending ? (
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                </button>
              </footer>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
