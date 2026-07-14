"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";

// A heartbeat older than this is treated as a dead/abandoned session (e.g.
// the browser was closed without a clean logout) — a new login proceeds
// without prompting. Must be comfortably larger than SessionGuard's 60s
// heartbeat interval so a live session's heartbeat never appears stale.
const GRACE_MS = 90_000;

export async function checkActiveSession(): Promise<{ hasOtherSession: boolean }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("active_session_last_seen_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const lastSeen = data?.active_session_last_seen_at
    ? new Date(data.active_session_last_seen_at).getTime()
    : null;

  const hasOtherSession = lastSeen !== null && Date.now() - lastSeen < GRACE_MS;
  return { hasOtherSession };
}

export async function heartbeatSession(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("users")
    .update({ active_session_last_seen_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
}

export async function clearActiveSession(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return; // already signed out — nothing to clear

  const supabase = await createServiceClient();
  await supabase
    .from("users")
    .update({ active_session_last_seen_at: null })
    .eq("id", user.id);
}
