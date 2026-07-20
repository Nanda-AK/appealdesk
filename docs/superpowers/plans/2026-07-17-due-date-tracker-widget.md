# Plan: Add "Due Date Tracker" widget to SP Dashboard (GitHub issue #21)

## Context

Issue #21 ("[Bug]: Dashboard changes", SP Portal — Dashboard) asks to rename the
"More than 7 Days" bucket in a "Due Date Tracker" panel to "Due in 30 days"
(screenshot attached to the issue).

**Investigation finding:** this widget does not exist anywhere in the current
codebase (checked `main`, `dev`, `fix/audit-logs-documents`, and full git
history). The SP dashboard was fully replaced by an interactive calendar in
commit `c09d87d` ("replace dashboard with full-width interactive calendar"),
and the old due-date/notice-status/priority widgets from the screenshot were
never carried forward. There is also no charting library in `package.json`,
which the donut/bar charts elsewhere in the screenshot would need.

**Confirmed scope with user:**
- Build only the **Due Date Tracker** widget (3 count rows). The rest of the
  screenshot (Notice Status Summary, Priority Distribution, Outcome Forecast,
  Team Workload, Authority-wise Notices) is out of scope — separate future issue.
- This is a **real bucket-boundary change**, not just a label swap:
  - **Due Today** — deadline is today or already passed (days remaining ≤ 0)
  - **Due in 7 Days** — 1–7 days remaining
  - **Due in 30 days** — 8–30 days remaining (bounded; previously unbounded "more than 7 days")
  - Proceedings due more than 30 days out, or with no deadline set, are not
    shown in this widget at all.
- **Total Open** = sum of the 3 buckets above (not all open proceedings).
- Placement: new 3rd column on the dashboard, to the right of the existing
  "Day Events" panel (calendar | Day Events | Due Date Tracker).

## Data source

`proceedings.to_be_completed_by` (date) + `proceedings.status` + `deleted_at`,
scoped to `service_provider_id`, same fields the dashboard already reads in
`app/(sp)/dashboard/page.tsx`. The existing `procData` query there is bounded
to the *current calendar year* (`yearStart`/`yearEnd`), which is wrong for
this widget — a 30-day-out deadline in early January would be invisible in
late December. So this needs its **own dedicated query** with a rolling
window instead of a calendar-year window:

```ts
const in30Days = /* today + 30 days, formatted YYYY-MM-DD */

supabase
  .from('proceedings')
  .select('id, to_be_completed_by')
  .eq('service_provider_id', spId)
  .eq('status', 'open')
  .is('deleted_at', null)
  .not('to_be_completed_by', 'is', null)
  .lte('to_be_completed_by', in30Days)
```

A single upper bound (`lte`) is sufficient — overdue rows naturally satisfy
it too, so they fall into the "Due Today" bucket during client-side bucketing.
Bucketing reuses the same day-math pattern already used for the old dashboard
(`Math.round((due - today) / 86400000)`), and the existing `extractDate()` /
`toDateStr()` helpers already in this codebase for normalizing dates.

## Files to change

### 1. `lib/dashboardConfig.ts` (edit)
Add a new documented section, consistent with the file's existing convention
(single source of truth for colors/labels/spacing, nothing hardcoded in
components):
```ts
// ─── DUE DATE TRACKER PANEL (right sidebar) ────────────────
export const DUE_TRACKER_PANEL_WIDTH = "w-64"
export const DUE_TRACKER_BUCKETS = [
  { key: "today", label: "Due Today",     dotCls: "bg-danger"  },
  { key: "week",  label: "Due in 7 Days", dotCls: "bg-warning" },
  { key: "month", label: "Due in 30 days",dotCls: "bg-success" },
] as const
```
(Colors reuse existing design tokens `danger`/`warning`/`success` from
`globals.css` per CLAUDE.md — no hardcoded hex.)

### 2. `components/sp/DueDateTrackerPanel.tsx` (new file)
Presentational component, structured like `components/sp/CalendarDayPanel.tsx`
(card header with icon, rows, footer):
- Props: `{ dueToday: number; dueIn7: number; dueIn30: number }`
- Header: "Due Date Tracker" (icon + title, matches `CalendarDayPanel` style)
- 3 rows built from `DUE_TRACKER_BUCKETS`, each with a colored dot, label,
  and right-aligned count (static — not clickable, since there's no existing
  due-date filter on the litigations list to deep-link to; out of scope here)
- Footer: "Total Open: {dueToday + dueIn7 + dueIn30}"
- Card wrapper: `bg-white border border-border rounded-xl p-4` (matches
  existing dashboard panel styling)

### 3. `components/sp/DashboardCalendar.tsx` (edit)
- Accept new prop `dueDateTracker: { dueToday: number; dueIn7: number; dueIn30: number }`
- Import `DueDateTrackerPanel` and `DUE_TRACKER_PANEL_WIDTH`
- In the outer `flex gap-4 h-full min-h-0` container, add a 3rd flex child
  after the existing Day Events panel:
  ```tsx
  <div className={`${DUE_TRACKER_PANEL_WIDTH} flex-shrink-0 bg-white border border-border rounded-xl p-4`}>
    <DueDateTrackerPanel {...dueDateTracker} />
  </div>
  ```

### 4. `app/(sp)/dashboard/page.tsx` (edit)
- Add the dedicated Supabase query described above (parallelized with the
  existing `procData`/`evtData` queries via `Promise.all`)
- Compute `in30Days` using the same local-date formatting pattern as
  `extractDate()`
- Bucket the results into `dueToday` / `dueIn7` / `dueIn30` counts
- Pass `dueDateTracker={{ dueToday, dueIn7, dueIn30 }}` to `<DashboardCalendar>`

## Open assumption to verify during implementation

`proceedings.status` is filtered as `.eq('status', 'open')` to match the
"Total Open" label. `supabase/schema.sql` is stale (missing `status`,
`deleted_at`, and other columns CLAUDE.md documents as live), so the real
allowed values can't be confirmed from it. The app's own UI treats status as
binary open/closed everywhere it's rendered (e.g. `STATUS_CFG` in
`AppealDetailClient.tsx`), so `.eq('status', 'open')` should be correct —
but worth a quick sanity check against real data (e.g. `select distinct
status from proceedings`) before/while implementing, in case an
`in_progress`-style value is actually in use and should also count as "open".

## Verification

1. `npm run build` — full production build must pass (per CLAUDE.md rule).
2. Load `/dashboard` as an SP user (via the `run` skill or `claude-in-chrome`)
   and visually confirm the 3rd column renders with correct counts.
3. Spot-check bucket boundaries against real data: pick proceedings due
   today, in 7 days, in 8 days, in 30 days, and 31+ days out; confirm each
   lands in the right bucket (or is excluded, for the 31+ day case) by
   cross-checking against a manual Supabase query.
4. Confirm "Total Open" equals the sum of the 3 displayed counts.
5. Resize/check layout doesn't overflow with 3 columns at typical laptop
   widths (calendar panel is `flex-1` so it should compress correctly, but
   worth a visual check since this is a new 3rd fixed-width column).
