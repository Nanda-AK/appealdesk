// ============================================================
// DASHBOARD GLOBAL CONFIGURATION
// ============================================================
// This is the single source of truth for every visual property
// on the SP dashboard — colours, spacing, font sizes, widths,
// default view mode, initial date, and locale.
//
// Edit a value here and it propagates to every dashboard panel
// automatically. Components import from this file; nothing is
// hardcoded inside them.
//
// Sections:
//   GREETING          — page heading, subtitle, styles (above the calendar)
//   VIEW TOGGLE + NAVIGATION — default view, initial date, locale, nav label
//   WEEK VIEW         — week grid columns, event cards
//   MONTH VIEW        — month grid cells, importance badges
//   DAY EVENTS PANEL  — right sidebar
//   SETTINGS PANEL    — calendar settings flyout
//   STATS BAR         — summary chips below the calendar
//   FILTERS           — client & act filter buttons/dropdowns
//   SHARED            — importance order (used in multiple panels)
// ============================================================

import type { ImportanceLevel } from "@/lib/calendarUtils";
import type { PossibleOutcome } from "@/lib/types";

// ─── GREETING (page heading above the calendar) ────────────

// Text that appears before the user's first name in the heading
// e.g. "Good morning" → "Good morning, Karan"
export const GREETING_PREFIX = "Good morning";

// Subheading text shown to sp_admin users
export const GREETING_SUBTITLE_ADMIN = "Here's an overview of your workspace";

// Subheading text shown to sp_staff (and other non-admin SP users)
export const GREETING_SUBTITLE_STAFF = "Here's your workload for today";

// CSS classes for the main greeting heading (h1)
export const GREETING_HEADING_CLS = "text-xl font-bold text-heading";

// CSS classes for the subtitle paragraph
export const GREETING_SUBTITLE_CLS = "text-sm text-secondary";

// ─── VIEW TOGGLE + NAVIGATION ──────────────────────────────

// Calendar view type used across all dashboard components
export type ViewMode = "month" | "week";

// Default view shown when the calendar first loads
export const DEFAULT_VIEW_MODE: ViewMode = "month";

// Returns the initial date the calendar opens to.
// Defaults to today. Override to pin a specific date.
export const getDefaultDate = (): Date => new Date();

// BCP 47 locale tag used for all date formatting in the calendar
// (nav label, week day headers, day panel date, upcoming panel)
export const NAV_DATE_LOCALE = "en-IN";

// Active tab style in the Month / Week toggle pill
export const VIEW_TOGGLE_ACTIVE_CLS = "bg-white shadow-sm text-heading";

// Inactive tab style in the Month / Week toggle pill
export const VIEW_TOGGLE_INACTIVE_CLS = "text-secondary hover:text-heading";

// Outer pill container for the Month / Week toggle
export const VIEW_TOGGLE_CONTAINER_CLS = "flex bg-surface-hover rounded-lg p-1";

// Prefix shown before the date in week-view nav label
// e.g. "Week of 15 Jun 2026"
export const NAV_WEEK_PREFIX = "Week of";

// Prev / Next navigation arrow button style
export const NAV_BTN_CLS =
  "p-1 rounded hover:bg-surface-hover text-secondary transition";

// ─── WEEK VIEW ──────────────────────────────────────────────

// Background tint applied to each day column body (Mon → Sun)
export const WEEK_COL_BODY_TINTS = [
  "#FFF5F5", // Monday
  "#FFFBEB", // Tuesday
  "#F0FFF4", // Wednesday
  "#EFF6FF", // Thursday
  "#F5F3FF", // Friday
  "#FFF0F6", // Saturday
  "#F0FDFA", // Sunday
];

// Header tint of each day column (Mon → Sun) — slightly darker than body
export const WEEK_COL_HEADER_TINTS = [
  "#FECACA", // Monday
  "#FDE68A", // Tuesday
  "#BBF7D0", // Wednesday
  "#BFDBFE", // Thursday
  "#DDD6FE", // Friday
  "#FBCFE8", // Saturday
  "#99F6E4", // Sunday
];

// Selected day header background — replaces the day's colour tint
export const WEEK_SELECTED_HEADER_BG = "#363636";

// Left accent border thickness on week event cards (px)
export const WEEK_EVENT_CARD_LEFT_BORDER = 3;

// Inner padding on week event cards
export const WEEK_EVENT_CARD_PADDING = "p-2";

// Gap between day columns in the week grid
export const WEEK_COL_GAP = "gap-2";

// ─── MONTH VIEW ────────────────────────────────────────────

// Day cell state: selected (the day the user clicked)
export const MONTH_CELL_SELECTED =
  "bg-primary/5 ring-2 ring-inset ring-primary";

// Day cell state: today's date
export const MONTH_CELL_TODAY = "ring-2 ring-inset ring-accent bg-accent-faint";

// Day cell state: default hover
export const MONTH_CELL_HOVER = "hover:bg-surface-hover";

// Date number circle — today
export const MONTH_DATE_TODAY = "bg-primary text-white";

// Date number circle — selected but not today
export const MONTH_DATE_SELECTED = "bg-primary/20 text-primary";

// Date number circle — default (neither today nor selected)
export const MONTH_DATE_DEFAULT = "text-heading";

// Size of the date number circle (Tailwind w-* h-*)
export const MONTH_DATE_CIRCLE_SIZE = "w-5 h-5";

// Font size of the importance count inside each month cell badge
export const MONTH_BADGE_FONT_SIZE = "9px";

// Minimum height of each importance badge row in a month cell
export const MONTH_BADGE_MIN_HEIGHT = "16px";

// ─── DAY EVENTS PANEL (right sidebar) ──────────────────────

// Width of the day events panel fixed sidebar
export const DAY_PANEL_WIDTH = "w-72";

// Left accent border thickness on day panel event cards (px)
export const DAY_PANEL_CARD_LEFT_BORDER = 3;

// Inner padding on day panel event cards
export const DAY_PANEL_CARD_PADDING = "p-2.5";

// ─── SETTINGS PANEL ────────────────────────────────────────

// Width of the calendar settings flyout panel
export const SETTINGS_PANEL_WIDTH = "w-72";

// Distance from top of the viewport
export const SETTINGS_PANEL_TOP = "mt-16";

// Distance from right of the viewport
export const SETTINGS_PANEL_RIGHT = "mr-4";

// Max height before the panel scrolls
export const SETTINGS_PANEL_MAX_HEIGHT = "max-h-[80vh]";

// ─── STATS BAR (row of chips below the calendar grid) ──────

// Padding on each stat chip
export const STATS_CHIP_PADDING = "px-2.5 py-1";

// Background colour of each stat chip
export const STATS_CHIP_BG = "bg-surface-hover";

// ─── FILTER BUTTONS (client & act) ─────────────────────────

// Active filter button — when 1+ items are selected
export const FILTER_ACTIVE_CLS = "border-primary bg-primary text-white";

// Inactive filter button — no items selected
export const FILTER_INACTIVE_CLS =
  "border-border text-secondary hover:bg-surface-hover";

// Width of filter dropdown panels
export const FILTER_DROPDOWN_WIDTH = "w-64";

// ─── DASHBOARD SIDE COLUMN (right of the calendar) ──────────
// Holds Due Date Tracker, Priority Distribution, Outcome Forecast,
// and Team Workload stacked vertically. Scrolls internally if the
// stacked cards exceed the calendar row's height.

export const SIDE_COLUMN_WIDTH = "w-72";

// ─── DUE DATE TRACKER PANEL ──────────────────────────────────

export const DUE_TRACKER_BUCKETS = [
  { key: "today", label: "Due Today", dotCls: "bg-danger" },
  { key: "week", label: "Due in 7 Days", dotCls: "bg-warning" },
  { key: "month", label: "Due in 30 days", dotCls: "bg-success" },
] as const;

// ─── SHARED ────────────────────────────────────────────────

// Ordering of importance levels used in stats bar, month legend,
// and any other multi-panel display. Change once, applies everywhere.
export const IMPORTANCE_ORDER: ImportanceLevel[] = [
  "critical",
  "high",
  "medium",
  "low",
];

// ─── OUTCOME FORECAST PANEL (bottom row) ────────────────────

// Ordering of outcome levels used in the Outcome Forecast panel
export const OUTCOME_ORDER: PossibleOutcome[] = [
  "favourable",
  "doubtful",
  "unfavourable",
];

export const OUTCOME_LABELS: Record<PossibleOutcome, string> = {
  favourable: "Favourable",
  doubtful: "Doubtful",
  unfavourable: "Unfavourable",
};

// ─── TEAM WORKLOAD PANEL (bottom row) ───────────────────────

// Max number of staff rows shown, sorted by workload descending
export const TEAM_WORKLOAD_MAX_ROWS = 5;

// ─── NOTICE STATUS SUMMARY PANEL (right sidebar) ────────────
// Simplified to the 2 statuses the app actually tracks on proceedings
// (open/closed). The 5-state version from the original mock (In Progress /
// Awaiting Information / Response Submitted) needs new schema fields we're
// not adding right now.
export const NOTICE_STATUS_ORDER = ["open", "closed"] as const;
export type NoticeStatus = (typeof NOTICE_STATUS_ORDER)[number];

export const NOTICE_STATUS_LABELS: Record<NoticeStatus, string> = {
  open: "Open",
  closed: "Closed",
};

// ─── AUTHORITY-WISE NOTICES PANEL (bottom row) ──────────────
// Open proceedings grouped by the appeal's Act/Regulation.

// Max number of act rows shown, sorted by count descending
export const AUTHORITY_NOTICES_MAX_ROWS = 5;

// ─── DASHBOARD ROW LAYOUT ────────────────────────────────────
// The dashboard is a fixed-height, non-scrolling 2-row layout:
//   Row 1 (fills remaining space) — Calendar + Day Events + right sidebar
//     (Due Date Tracker, Notice Status Summary, Priority Distribution)
//   Row 2 (fixed height)          — Outcome Forecast, Team Workload,
//     Authority-wise Notices
export const DASHBOARD_BOTTOM_ROW_HEIGHT = "h-44";
