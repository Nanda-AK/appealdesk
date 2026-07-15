-- Adds a per-user heartbeat timestamp used to detect whether the user
-- already has another active session at login time (single-active-session
-- feature). Idempotent — safe to re-run.

ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_last_seen_at timestamptz;
