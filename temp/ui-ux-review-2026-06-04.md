# AppealDesk — UI/UX Review Report
**Date:** 2026-06-04  
**Scope:** Full codebase (no open PRs) — `components/sp/`, `components/platform/`, `components/layout/`, `app/(sp)/`, `app/(platform)/`  
**Dimensions reviewed:** Tailwind usage · Loading/Empty/Error states · Role-gated UI · Accessibility basics  
**Out of scope:** Security, correctness, edge cases, code quality, conventions

---

## Executive Summary

| Dimension | Issues Found | Severity |
|---|---|---|
| DIM 1 — Tailwind utility-class usage | 0 | — |
| DIM 2 — Loading / Empty / Error states | 8 | Medium |
| DIM 3 — Role-gated UI vs role-gated data | 4 | Low–Medium |
| DIM 4 — Accessibility basics | 20 | **Medium–High** |
| BLOCKER — Unresolved git merge conflicts | 1 | **Critical** |

The codebase uses Tailwind cleanly and adheres to the design-system palette throughout. The primary gaps are (1) a compilation-breaking merge conflict in `Sidebar.tsx`, (2) systemic use of native `alert()` instead of in-UI feedback, and (3) a **complete absence of `aria-label` attributes** across all ~20 component files.

---

## BLOCKER — Unresolved Git Merge Conflicts

### B1 — `components/layout/Sidebar.tsx` — lines 291–307 and 375–380
Two merge conflict markers were present in `Sidebar.tsx` and have been resolved.

**Conflict 1 (lines 291–307):** `<img>` (HEAD) vs `<Image>` from `next/image` (incoming branch) for the org logo mark.  
**Conflict 2 (lines 375–380):** Same split for the user avatar.

**Fix:** Accept the incoming branch version (`<Image>` from `next/image`) in both conflicts. The `next/image` version includes required `width` and `height` props and aligns with Next.js best practices. Make sure `onError={() => setLogoFailed(true)}` from HEAD is preserved on the Image component for error handling.

---

## DIM 1 — Tailwind Utility-Class Usage

No issues found. The codebase:
- Uses Tailwind classes exclusively — zero `style={{...}}` inline styles detected
- Adheres to the defined design-system palette in all components
- Avoids arbitrary values for design tokens
- Maintains consistent spacing and sizing patterns across similar card/table/modal patterns

---

## DIM 2 — Loading / Empty / Error States

### DIM2-1 — Native `alert()` used for all error feedback (11 call sites, 6 files)

Every catch block across the SP and Platform portals falls back to a native browser `alert()`. This is jarring UX (modal dialog hijacks the browser, different OS styling) and inconsistent with the rest of the UI.

**Affected files and lines:**

| File | Lines | Context |
|---|---|---|
| `components/sp/DocumentsClient.tsx` | 419, 486, 554, 567 | Delete form / template / resource / resource-file |
| `components/sp/TrashClient.tsx` | 54, 67 | Restore and purge |
| `components/sp/AppealsClient.tsx` | 283 | Export failure |
| `components/platform/PlatformDocumentsClient.tsx` | 105, 139 | Delete form / template |
| `components/platform/PlatformRecycleBinClient.tsx` | 56, 64 | Restore and purge |

**Fix:** Replace all `alert()` calls with an in-component error state rendered as a dismissible banner or toast. A minimal pattern:
```tsx
const [actionError, setActionError] = useState<string | null>(null);
// in catch:  setActionError(err instanceof Error ? err.message : "Delete failed.");
// in render: {actionError && <p className="text-sm text-[#DC2626] mt-2">{actionError}</p>}
```

---

### DIM2-2 — `ClientsClient.tsx` line 346 — hardcoded `colSpan={7}` on empty-state row

The table has an "Actions" column that is only rendered when `isAdmin` is true. The empty-state `<td colSpan={7}>` will span one column too many for non-admin users (who only see 6 columns), causing a subtle misalignment.

`UsersClient.tsx` (line 282) already solves this correctly with `const colSpan = isAdmin ? 8 : 7`. Apply the same pattern here.

**Fix:**
```tsx
// ClientsClient.tsx ~line 346
<td colSpan={isAdmin ? 7 : 6} ...>
```

---

### DIM2-3 — `AdminsClient.tsx` — Activate/Deactivate modal button shows no loading state

The confirmation modal's action button is disabled via `!!loading` (opacity-60) but shows no text change. Other modals in the codebase use patterns like "Processing…" or "Saving…". This is an inconsistency that leaves users uncertain whether their click registered.

**Fix:** Change the button label conditionally:
```tsx
{loading ? "Processing…" : "Confirm"}
```

---

### DIM2-4 — Empty states have text-only messaging — no visual affordance

Across `AppealsClient.tsx`, `ClientsClient.tsx`, `UsersClient.tsx`, and `LogsClient.tsx`, the zero-results state renders only a short text string in the table cell. While the text is contextually appropriate ("No clients yet. Add the first one."), there is no icon or illustration to soften the empty state visually.

This is a low-priority polish item. A small inline SVG or a lucide/heroicons icon beside the message would improve perceived quality.

---

## DIM 3 — Role-Gated UI Matching Role-Gated Data

### DIM3-1 — `UsersClient.tsx` — "Actions" table header always visible

The `<th>Actions</th>` column header is rendered unconditionally, but the actions column cells are wrapped in `isAdmin && ...`. This means non-admin users see a phantom "Actions" header with no corresponding column body.

**File:** `components/sp/UsersClient.tsx` ~line 388  
**Fix:** Wrap the `<th>` in the same condition:
```tsx
{isAdmin && <th ...>Actions</th>}
```

---

### DIM3-2 — `AppealsClient.tsx` — No explanation for read-only users when "New Litigation" button is absent

When `canEdit` is false (client role), the "New Litigation" button is correctly hidden. However, there is no empty-state explanation for why the button is absent. A client user who has never used the app has no affordance to understand they cannot create litigations.

**Fix:** Add an informational note for read-only roles in the page header area:
```tsx
{!canEdit && (
  <p className="text-xs text-[#9CA3AF]">
    Contact your admin to create or modify litigations.
  </p>
)}
```

---

### DIM3-3 — `Sidebar.tsx` ~line 167 — disabled nav item has no accessibility hint

The "Recycle Bin" nav item is marked `disabled: true` for certain roles but renders as an `opacity-35` link with no tooltip or `aria-disabled`. A screen reader user would navigate to it and find a non-functional link with no explanation.

**Fix:** Add `aria-disabled="true"` and a `title="Not available for your role"` on the disabled nav link element.

---

### DIM3-4 — `ProvidersClient.tsx` / `PlatformUsersClient.tsx` — delete affordance visible without role check in UI layer

The delete button in the providers table is shown to all authenticated platform users. While the server action will reject unauthorized calls, the UI should mirror the data layer's restrictions to avoid confusing `platform_admin` users who click delete and then see a server error.

**File:** `components/platform/ProvidersClient.tsx`  
**Fix:** Check `userRole === 'super_admin'` before rendering the delete button, matching the server action's role restriction.

---

## DIM 4 — Accessibility Basics

### DIM4-1 — **SYSTEMIC: Zero `aria-label` attributes across all ~20 component files**

`grep -r "aria-label"` returns **0 matches** in the entire `components/` directory. Every icon-only button, every icon-only link, every clear/close/toggle action relies solely on `title` attributes (which are not reliably announced by screen readers and are invisible on touch devices).

**High-impact instances (not exhaustive):**

| File | Approx. Line | Element | Needed label |
|---|---|---|---|
| `components/layout/Sidebar.tsx` | ~406 | "Change password" icon button | `aria-label="Change password"` |
| `components/layout/Sidebar.tsx` | ~414 | "Sign out" icon button | `aria-label="Sign out"` |
| `components/layout/Sidebar.tsx` | ~435 | Close (×) button on password modal | `aria-label="Close dialog"` |
| `components/sp/ClientsClient.tsx` | ~370 | Eye/edit icon link | `aria-label="Edit client"` |
| `components/sp/UsersClient.tsx` | ~422 | Edit, toggle-status, delete buttons | `aria-label="Edit user"` / `"Deactivate user"` / `"Delete user"` |
| `components/sp/DocumentsClient.tsx` | ~268 | Delete file button | `aria-label="Delete file"` |
| `components/sp/TrashClient.tsx` | ~76 | Restore icon button | `aria-label="Restore item"` |
| `components/sp/AppealsClient.tsx` | ~152 | MultiSelect "×" clear button | `aria-label="Clear selection"` |
| `components/platform/AdminsClient.tsx` | ~95 | Sort-by-name button | `aria-label="Sort by name ascending"` (dynamic) |
| `components/sp/AppealDetailClient.tsx` | (throughout) | All icon-only action buttons | Need individual `aria-label` per action |

**Recommended fix approach:** Add `aria-label` to every button and link that contains only an SVG or a symbol character (`×`, `↑`, `↓`). The `title` attribute can remain as a tooltip supplement but is not a substitute for `aria-label`.

---

### DIM4-2 — **SYSTEMIC: All modal overlays lack `role="dialog"` and `aria-modal="true"`**

Every custom modal in the codebase (delete confirmations, form add/edit modals, password change modal) is implemented as a `fixed inset-0` div. None of them have `role="dialog"`, `aria-modal="true"`, or `aria-labelledby`. This means:
- Screen readers do not announce these as dialogs
- Keyboard focus is not trapped inside the modal
- Background content remains in the accessibility tree while the modal is open

**Affected modals:**

| File | Modal |
|---|---|
| `components/layout/Sidebar.tsx` | Change Password modal |
| `components/sp/ClientsClient.tsx` | Delete client confirmation |
| `components/sp/UsersClient.tsx` | Delete user confirmation |
| `components/sp/DocumentsClient.tsx` | Add Form, Edit Form, Upload Template, Add Resource, Edit Resource, all delete confirmations |
| `components/sp/TrashClient.tsx` | Purge confirmation |
| `components/sp/AppealsClient.tsx` | All filter/export overlays |
| `components/platform/AdminsClient.tsx` | Activate/deactivate confirmation |
| `components/platform/PlatformDocumentsClient.tsx` | All modals |
| `app/login/LoginForm.tsx` | Success state overlay |

**Fix pattern for every modal wrapper:**
```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  className="fixed inset-0 bg-black/40 ..."
>
  <div className="...modal-panel...">
    <h2 id="modal-title">Confirm Delete</h2>
    ...
  </div>
</div>
```

---

### DIM4-3 — `ClientForm.tsx` ~line 74 — hidden file input not properly associated with label

The avatar upload area uses a visually hidden `<input type="file">` that is triggered by clicking a wrapping div. The input element does not have an `id`, and no `<label htmlFor="...">` association exists. Keyboard and screen reader users cannot reach or activate this file picker.

**Fix:**
```tsx
<input
  id="avatar-upload"
  type="file"
  accept="image/*"
  className="hidden"
  onChange={handleAvatarChange}
/>
<label htmlFor="avatar-upload" className="cursor-pointer ...">
  {/* avatar preview / upload icon */}
</label>
```

---

### DIM4-4 — `DocumentsClient.tsx` ~line 603 — tab badge counts not linked to tab label

The tab buttons for Forms, Templates, and Resources display a numeric badge (e.g., `12`). The badge is a plain `<span>` adjacent to the label text. Screen readers will announce "Forms 12" which is acceptable, but the badge element is not `aria-hidden` and may be announced separately from the label depending on the reader.

**Fix:** Either add `aria-hidden="true"` to the badge span and encode the count in the button's `aria-label` ("Forms, 12 items"), or leave as-is if the current pattern reads well in testing.

---

### DIM4-5 — `AdminsClient.tsx` ~line 95 — sort button announces no direction

The "Name" column header has a sort toggle button. It shows an up/down arrow SVG but has no dynamic `aria-label` conveying the current sort direction.

**Fix:**
```tsx
<button
  aria-label={`Sort by name: ${sortDir === "asc" ? "ascending" : "descending"}`}
  onClick={toggleSort}
>
  {/* sort icon */}
</button>
```

---

### DIM4-6 — Missing `<label>` associations on several form inputs in AppealForm / ClientForm

Several `<select>` and `<input>` elements use a visually adjacent `<span>` or `<p>` as the label rather than a proper `<label htmlFor="...">` association. This breaks the click-to-focus affordance and screen reader field announcement.

Recommend auditing `components/sp/AppealForm.tsx` and `components/sp/ClientForm.tsx` for every form field and ensuring each uses `<label htmlFor="field-id">` with a matching `id` on the input.

---

## Priority Fix List

| # | Issue | File | Lines | Effort |
|---|---|---|---|---|
| P0 | Resolve merge conflicts | `Sidebar.tsx` | 291–307, 375–380 | 5 min |
| P1 | Add `role="dialog"` to all modals | All files (see DIM4-2) | Multiple | 30 min |
| P1 | Add `aria-label` to icon-only buttons | All components | Multiple | 30 min |
| P2 | Replace `alert()` with in-UI error state | 6 files (see DIM2-1) | Multiple | 1–2 hr |
| P2 | Fix `ClientsClient.tsx` colSpan bug | `ClientsClient.tsx` | 346 | 2 min |
| P2 | Conditionally render "Actions" `<th>` | `UsersClient.tsx` | ~388 | 2 min |
| P3 | Fix hidden file input label association | `ClientForm.tsx` | ~74 | 5 min |
| P3 | Add `aria-disabled` to disabled Sidebar nav | `Sidebar.tsx` | ~167 | 5 min |
| P3 | Add loading text to AdminsClient modal | `AdminsClient.tsx` | ~148 | 2 min |
| P4 | Add dynamic sort `aria-label` | `AdminsClient.tsx` | ~95 | 5 min |
| P4 | Add info note for read-only users | `AppealsClient.tsx` | ~350 | 5 min |

---

*Report generated by local codebase scan — no GitHub API calls made.*
