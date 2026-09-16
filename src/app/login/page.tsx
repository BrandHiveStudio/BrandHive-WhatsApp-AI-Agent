"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { BrandHiveLogo } from "@/components/brandhive-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError("App is not configured correctly. Contact an administrator.");
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (signInError) {
      setError("Invalid email or password.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--app-bg)] text-[var(--text-primary)] px-4 py-8 select-none transition-colors">
      {/* Top Floating Theme Switcher */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-7 shadow-lg">
        {/* BrandHive Logo & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <BrandHiveLogo size={56} className="mb-3" />
          <h1 className="text-base font-bold text-[var(--text-primary)]">
            BrandHive Studio
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            WhatsApp AI Agent Admin Portal
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs text-red-500 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
              htmlFor="email"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@brandhive.io"
              className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--wa-green)] transition-colors"
            />
          </div>

          <div>
            <label
              className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--wa-green)] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[var(--wa-green)] py-2.5 text-xs font-semibold text-white hover:bg-[var(--wa-green-hover)] disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign in to Dashboard</span>
            )}
          </button>
        </form>
      </div>

      <footer className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-[var(--text-muted)]">
        <Link
          href="/privacy-policy"
          className="hover:text-[var(--text-primary)] transition-colors"
        >
          Privacy Policy
        </Link>
        <span>•</span>
        <Link
          href="/terms"
          className="hover:text-[var(--text-primary)] transition-colors"
        >
          Terms of Service
        </Link>
        <span>•</span>
        <Link
          href="/data-deletion"
          className="hover:text-[var(--text-primary)] transition-colors"
        >
          Data Deletion
        </Link>
      </footer>
    </div>
  );
}
