"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { heartbeatSession, clearActiveSession } from "@/lib/session-actions";

const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_LEAD_MS = 60 * 1000; // show the warning 60s before the limit
const IDLE_CHECK_INTERVAL_MS = 5_000;
const SESSION_POLL_INTERVAL_MS = 60_000;
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

export default function SessionGuard() {
  const router = useRouter();
  // Seeded with 0 (a pure literal) rather than Date.now() — calling an impure
  // function directly in a useRef initializer during render trips this repo's
  // react-hooks/purity lint rule. The real timestamp is set in the effect
  // below via resetActivity(), which runs after mount, before the idle-check
  // interval's first tick.
  const lastActivityRef = useRef(0);
  const hasLoggedOutRef = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSecondsLeft(null);
  }, []);

  const forceLogout = useCallback(
    async (reason: "idle_timeout" | "session_replaced") => {
      if (hasLoggedOutRef.current) return;
      hasLoggedOutRef.current = true;

      try {
        await clearActiveSession();
      } catch {
        // best-effort — don't block logout on a bookkeeping failure
      }
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // best-effort — still redirect even if signOut() itself fails
        // (e.g. a network hiccup); proxy.ts re-validates on the next
        // request regardless, and hasLoggedOutRef must not get "stuck"
        // permanently guarding against a redirect that never happened
      }
      router.push(`/login?error=${reason}`);
    },
    [router],
  );

  // Activity listeners reset the idle clock. Passive + cheap (ref write, no
  // re-render) so mousemove/scroll don't cause perf issues. Also seeds
  // lastActivityRef with a real timestamp on mount (see comment above) — a
  // direct ref write here, NOT a call to resetActivity(), since calling a
  // setState-invoking function synchronously in an effect body trips this
  // repo's react-hooks/set-state-in-effect rule. secondsLeft is already
  // null from its initial useState value, so there's nothing to setState
  // on first mount anyway.
  useEffect(() => {
    lastActivityRef.current = Date.now();
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, resetActivity, { passive: true }),
    );
    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetActivity));
    };
  }, [resetActivity]);

  // Idle-timeout ticker: shows the warning modal in the last 60s, force-logs-out at 30 min.
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = IDLE_LIMIT_MS - elapsed;

      if (remaining <= 0) {
        forceLogout("idle_timeout");
        return;
      }
      setSecondsLeft(remaining <= WARNING_LEAD_MS ? Math.ceil(remaining / 1000) : null);
    }, IDLE_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [forceLogout]);

  // Session-validity + heartbeat ticker: catches a session revoked elsewhere
  // (single-active-login), and otherwise refreshes the heartbeat so future
  // logins can detect this session as still alive.
  useEffect(() => {
    let cancelled = false;

    async function check() {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error || !data.user) {
        forceLogout("session_replaced");
        return;
      }
      try {
        await heartbeatSession();
      } catch {
        // transient failure — don't force logout on a single missed heartbeat
      }
    }

    check(); // immediate check on mount, avoids a 60s bootstrap gap
    const id = setInterval(check, SESSION_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [forceLogout]);

  if (secondsLeft === null) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl border border-border p-6 w-full max-w-sm mx-4">
        <h3 className="text-base font-semibold text-heading mb-2">Session Expiring</h3>
        <p className="text-sm text-secondary mb-5">
          You&apos;ll be signed out in {secondsLeft}s due to inactivity.
        </p>
        <button
          type="button"
          onClick={resetActivity}
          className="w-full px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition"
        >
          Stay Signed In
        </button>
      </div>
    </div>
  );
}
