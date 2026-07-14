# Session Idle Timeout + Single Active Login — Design

## Goal

Two related session-security features, requested together:

1. **Idle timeout**: a user who is inactive for 30 minutes is automatically signed out and returned to `/login`, warned 60 seconds beforehand so in-progress work isn't lost without notice.
2. **Single active login**: only one active session per user is allowed. If a user logs in while already signed in elsewhere, they're asked to confirm before the older session is kicked out — not kicked silently.

Applies uniformly across both portals (`(platform)` and `(sp)`) and all roles. No behavior change for users who never have a stale/duplicate session.

## Why this shape

- Supabase's `auth.getUser()` (already used everywhere in this app — `proxy.ts`, `lib/user.ts`) always revalidates against the Auth server rather than trusting the local JWT. That means once a session is revoked (via `supabase.auth.signOut({ scope: 'others' })`), the revoked session's next `getUser()` call will simply fail — no bespoke revocation-check infrastructure is needed on the kicked side.
- There is no client-SDK method to "peek" at whether a user has another live session before completing a new login. To support the confirm/cancel prompt (rather than a silent kick), we need one small piece of server-side state: a heartbeat timestamp per user.
- Everything else is intentionally client-driven (timers, activity listeners) to avoid adding new backend infrastructure for a feature that's fundamentally about client-side presence.

## Data model change

One new nullable column:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_last_seen_at timestamptz;
```

- Set (to `now()`) whenever a session is confirmed active: on login completion, and refreshed every ~60s by a heartbeat while the app is open in a tab.
- Cleared (to `null`) on any logout: explicit (Sidebar), idle-timeout, or kicked-session detection.
- Treated as **stale** (i.e., "no other session to worry about") if older than 90 seconds — this bounds the worst case where an old tab was closed without a clean logout (browser crash, laptop closed) from blocking future logins indefinitely.

No other schema changes. No new tables.

## New/changed files

| File | Change |
|---|---|
| `supabase/migrations/20260714_add_active_session_tracking.sql` (new) | The `ALTER TABLE` above. Idempotent, following this repo's convention. |
| `lib/session-actions.ts` (new) | Server actions: `checkActiveSession()`, `heartbeatSession()`, `clearActiveSession()`. Follow the standard Server Action pattern (`getCurrentUser()` first, `createServiceClient()` for the write). |
| `components/layout/SessionGuard.tsx` (new) | Client component owning idle-timeout tracking, the warning modal, and the 60s "am I still authorized" poll. Mounted once per portal layout, alongside `Sidebar`. |
| `app/(platform)/layout.tsx`, `app/(sp)/layout.tsx` | Add `<SessionGuard />` next to the existing `<Sidebar />` mount. |
| `app/login/LoginForm.tsx` | After `signInWithPassword` succeeds: call `checkActiveSession()`; if another session is live, show the confirm/cancel dialog instead of proceeding immediately. Add `idle_timeout` and `session_replaced` entries to the existing `errorMessages` map (the `?error=` convention already used for `deactivated`/`no_profile`). |
| `components/layout/Sidebar.tsx` | `handleLogout()` also calls `clearActiveSession()` before redirecting, so a clean logout frees the slot immediately rather than waiting on the 90s staleness window. |

No changes needed to `proxy.ts` — its existing "not logged in → redirect to `/login`" branch already covers a revoked session's next request.

## Flows

### 1. Idle timeout (`SessionGuard.tsx`)

- On mount, attach passive listeners for `mousemove`, `keydown`, `click`, `scroll`, `touchstart` on `window`, each updating a `lastActivityRef` timestamp (a ref, not state — no re-render on every mouse move).
- A `setInterval` every 5s checks elapsed time since `lastActivityRef`:
  - At 29 minutes idle → show the warning modal (state flip, one render) with a live countdown.
  - At 30 minutes idle → `supabase.auth.signOut()` (local), `clearActiveSession()`, redirect to `/login?error=idle_timeout`.
- Any further activity while the warning modal is showing (via the same listeners, or an explicit "Stay Signed In" button in the modal) resets `lastActivityRef` and hides the modal — no separate logic path, the modal is purely a presentational reflection of elapsed time.
- Warning modal reuses this app's existing inline dialog convention (`fixed inset-0 bg-black/40 flex items-center justify-center z-50`, white rounded-xl card) — same pattern as Sidebar's change-password modal. Content: "You'll be signed out in Ns due to inactivity." + a primary "Stay Signed In" button.

### 2. Kicked-session detection (`SessionGuard.tsx`)

- A second `setInterval` every 60s calls `supabase.auth.getUser()`. If it errors or returns no user, the session has been revoked elsewhere:
  - `clearActiveSession()` (best-effort; may already be gone), redirect to `/login?error=session_replaced`.
- Runs independently of the idle-activity timer — a session can be kicked even while the user is actively working.

### 3. Login with a conflicting session (`LoginForm.tsx`)

1. `signInWithPassword` succeeds.
2. Call `checkActiveSession()` — reads `active_session_last_seen_at` for that user.
   - Empty or older than 90s → no conflict. Call `heartbeatSession()` to stamp it, `router.refresh()` into the app as today.
   - Fresh (<90s) → show a confirm dialog: *"Your account is currently signed in on another device or browser. Continue here and sign out the other session, or cancel?"*
     - **Continue** → `supabase.auth.signOut({ scope: 'others' })`, `heartbeatSession()`, proceed into the app.
     - **Cancel** → `supabase.auth.signOut({ scope: 'local' })` (undoes the just-created session), stay on `/login`, no state changes.

### 4. Heartbeat

- While `SessionGuard` is mounted and the tab is open, call `heartbeatSession()` every 60s (can share the same interval as the kicked-session poll — one tick does both: check `getUser()`, then if still valid, stamp the heartbeat).

## Error messages on `/login`

Extend the existing `errorMessages` map in `LoginForm.tsx`:

```ts
idle_timeout: "You were signed out due to 30 minutes of inactivity.",
session_replaced: "Your account was signed in from another device.",
```

Rendered via the existing red alert banner — no new UI component needed.

## Edge cases

- **Old tab closed uncleanly** (crash, laptop shut): heartbeat simply stops updating; after 90s a new login proceeds without a warning (correctly treating the dead session as gone), and after 30 idle minutes the never-cleared session would have force-logged-out anyway had it still been reachable.
- **Two logins within the 90s grace window in quick succession, no malicious intent** (e.g., user opens the app in two tabs of the same browser almost simultaneously): both would trigger the confirm dialog since each is a fresh `signInWithPassword`. This matches the "single active session" requirement as stated — same-browser multi-tab is not special-cased. If this turns out to be too aggressive in practice (e.g., users routinely opening a second tab), that's a follow-up tuning conversation, not a blocker for this design.
- **`checkActiveSession()`/`heartbeatSession()` failing transiently** (network blip): fail open — don't block login or force a spurious logout on a single failed heartbeat tick; only act on a confirmed `getUser()` failure for the kicked-detection path (which already implies the Auth server is reachable and explicitly said "no").
- **Background/throttled tabs**: browsers throttle `setInterval` in inactive tabs but generally still honor ~60s-scale intervals; no special handling needed at this app's scale.

## Testing / verification

1. `npm run build` — full production build.
2. Manual click-through:
   - Idle: sit inactive for 29 minutes (or temporarily lower the thresholds in dev), confirm warning modal appears with countdown, confirm "Stay Signed In" resets it, confirm reaching 0 signs out and lands on `/login` with the idle-timeout banner.
   - Single session: log in as the same user in two different browsers; confirm the second login shows the confirm/cancel dialog; confirm "Continue" kicks the first browser (verify it redirects to `/login` with the "signed in elsewhere" banner within ~60s); confirm "Cancel" leaves the first browser's session untouched and returns the second browser to `/login`.
   - Explicit logout via Sidebar frees the slot immediately (a subsequent login from elsewhere should not show the confirm dialog).
3. Confirm no regression to normal login (no conflicting session) — should behave exactly as today, just with one extra network round-trip (`checkActiveSession()`).

## Out of scope

- Configurable timeout duration per role/org (uniform 30 min for everyone, per the request).
- A "sessions" admin view (listing/revoking a user's active sessions from the Platform portal) — not requested; `active_session_last_seen_at` is an internal implementation detail, not user-facing.
- Real-time push-based kick notification (e.g. Supabase Realtime) — the 60s poll is an accepted latency trade-off for staying purely client-driven with no new infrastructure.
