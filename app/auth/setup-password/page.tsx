"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SetupPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Verify user has an active invite session before showing the form
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login?error=invite_expired");
      } else {
        setSessionReady(true);
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="animate-pulse text-secondary text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary mb-4">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <h1 className="text-2xl font-semibold text-heading">Set Your Password</h1>
          <p className="text-secondary text-sm mt-1">Create a password to access your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-heading mb-1.5">New Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-3.5 py-2.5 rounded-lg border-2 border-accent text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-heading mb-1.5">Confirm Password</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="w-full px-3.5 py-2.5 rounded-lg border-2 border-accent text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
            >
              {loading ? "Setting password…" : "Set Password & Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
