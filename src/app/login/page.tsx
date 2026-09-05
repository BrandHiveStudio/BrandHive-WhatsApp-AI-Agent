"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

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
    <div className="flex h-screen items-center justify-center bg-[#0f0f0f]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-white/[0.06] bg-[#141414] p-6"
      >
        <h1 className="mb-1 text-sm font-semibold text-white">BrandHive Studio</h1>
        <p className="mb-6 text-xs text-white/40">Sign in to the WhatsApp agent dashboard</p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
        )}

        <label className="mb-1 block text-xs text-white/50" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-emerald-500/40"
        />

        <label className="mb-1 block text-xs text-white/50" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-emerald-500/40"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
