"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  const searchParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;
  const deactivated = searchParams?.get("error") === "deactivated";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#1E3A5F] mb-4">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#1A1A2E]">AppealDesk</h1>
          <p className="text-[#6B7280] text-sm mt-1">Appeal Management Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <h2 className="text-lg font-semibold text-[#1A1A2E] mb-6">Sign in to your account</h2>

          {deactivated && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
              Your account has been deactivated. Contact your administrator.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] text-[#1A1A2E] text-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] text-[#1A1A2E] text-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent transition"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#1E3A5F] hover:bg-[#162d4a] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#6B7280] mt-6">
          Contact your administrator if you need access.
        </p>
      </div>
    </div>
  );
}
