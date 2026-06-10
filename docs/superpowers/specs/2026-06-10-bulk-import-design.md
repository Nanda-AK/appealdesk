# Bulk Import Feature — Design Spec

**Date:** 2026-06-10  
**Status:** Approved  
**Scope:** SP Portal — Bulk upload for Clients, Team Users, and Client Users

---

## Context

CA firms onboarding onto AppealDesk typically have existing client rosters and staff lists maintained in Excel. Manually entering 50–200 clients and users one at a time is a significant friction point during initial setup. Bulk import solves the one-time migration problem by letting an `sp_admin` upload a pre-filled Excel template to populate all three entity types at once.

This is an infrequent, admin-only, setup-time operation — not a daily workflow tool.

---

## Location

**Settings page → new "Bulk Import" section**, rendered as a third block below the existing `SpSettingsClient` and `SpApiSettingsClient` sections. The settings page currently has no tab UI — sections stack vertically. Bulk Import follows the same pattern rather than introducing a tab restructure.

To signal it's a distinct tool, the Bulk Import section gets its own card with a heading ("Bulk Import") and a short description ("Import clients and users in bulk from an Excel file. Use this during initial setup.").

Rationale: Bulk import is a setup/onboarding operation, not a day-to-day data entry action. Settings is where `sp_admin` goes during initial account configuration.

Access: `sp_admin` only — the section is not rendered for `sp_staff` or `client` roles.

---

## Three Import Types

| Type | Creates | Key constraint |
|------|---------|---------------|
| Clients | `organizations` (type=client) + `compliance_details` | PAN mandatory; name unique per SP |
| Team Users | `users` (role=sp_admin or sp_staff) | Email globally unique |
| Client Users | `users` (role=client) + `user_org_memberships` | Email globally unique; client org required |

Each type has its own card on the Bulk Import tab with:
- "Download Template" button
- Drag-and-drop / click-to-upload area (.xlsx only)

---

## Excel Templates

### Template Structure
- **Sheet 1 ("Data"):** Column headers (row 1), one example row (row 2, greyed out), data entry from row 3
- **Sheet 2 ("_Lists", hidden):** Reference data for all dropdowns (states, business types, roles, client orgs)
- Column headers mark mandatory fields with `*` (e.g., `Client Name *`)
- Max 500 rows per upload; max 5 MB file size

### Dropdown Fields (Excel Data Validation)
All dropdown options are embedded in the hidden `_Lists` sheet and applied as cell-range data validation — works fully offline.

| Template | Field | Options |
|----------|-------|---------|
| Clients | Business Type | Company, Trust, Partnership, LLP, Sole Proprietorship, OPC, HUF, Individual |
| Clients | State | 36 Indian states and UTs (from `INDIAN_STATES` constant) |
| Team Users | Role | sp_admin, sp_staff |
| Team Users | State | 36 Indian states and UTs |
| Client Users | Client Organisation | Active client orgs for this SP only — **populated at download time** |

### Client Template Fields

| Column | Mandatory | Notes |
|--------|-----------|-------|
| Client Name | YES | Case-insensitive unique check per SP |
| PAN Number | YES | Format ABCDE1234F; unique per SP |
| Business Type | No | Dropdown |
| Date of Incorporation | No | DD/MM/YYYY |
| Address Line 1 | No | |
| Address Line 2 | No | |
| City | No | |
| State | No | Dropdown |
| PIN Code | No | 6 digits |
| Country | No | Default: India |
| PAN Login ID | No | |
| PAN Password | No | |
| GST Number | No | |
| GST Login ID | No | |
| GST Password | No | |
| TAN Number | No | |
| TAN Login ID | No | |
| TAN Password | No | |
| Aadhaar Number | No | |
| Aadhaar Login ID | No | |
| Aadhaar Password | No | |

File attachments (logo, PAN scan, Aadhaar scan) are not supported in bulk import — use the individual client edit form.

### Team User Template Fields

| Column | Mandatory | Notes |
|--------|-----------|-------|
| First Name | YES | |
| Last Name | YES | |
| Email | YES | Globally unique |
| Role | YES | Dropdown: sp_admin, sp_staff |
| Middle Name | No | |
| Mobile Number | No | |
| Date of Birth | No | DD/MM/YYYY |
| Department | No | |
| Designation | No | |
| Date of Joining | No | DD/MM/YYYY |
| Date of Leaving | No | DD/MM/YYYY |
| Address Line 1 | No | |
| Address Line 2 | No | |
| City | No | |
| State | No | Dropdown |
| PIN Code | No | |
| Country | No | |
| PAN Number | No | |
| Aadhaar Number | No | |

### Client User Template Fields

| Column | Mandatory | Notes |
|--------|-----------|-------|
| First Name | YES | |
| Last Name | YES | |
| Email | YES | Globally unique |
| Client Organisation | YES | Dropdown — SP's active clients, embedded at download time |
| Middle Name | No | |
| Mobile Number | No | |
| Date of Birth | No | DD/MM/YYYY |

**Important:** The Client User template's dropdown list is a snapshot at download time. If new clients are added after download, re-download a fresh template to include them.

---

## Upload Flow

```
Download Template → Fill in Excel → Upload .xlsx → Preview Table → Confirm → Summary
```

### Step 1 — Template Download
- Generated client-side using `exceljs` (dynamic import, not static — consistent with app pattern)
- For Client User template: server action fetches active client orgs for the SP, embedded into the file before download

### Step 2 — File Upload
- Accept `.xlsx` only; reject other formats with a clear error
- Parse client-side with `exceljs` (dynamic import)
- Skip blank rows silently

### Step 3 — Validation (two-pass)

**Pass 1 — Client-side (instant):**
- Mandatory fields present
- Email format valid
- Date format valid (DD/MM/YYYY)
- PAN format valid (ABCDE1234F pattern) where provided
- Dropdown values match allowed options
- Duplicate emails / PAN numbers within the same upload file

**Pass 2 — Server-side (DB check via server action):**
- Email already exists in Supabase Auth
- Client name already exists for this SP (case-insensitive)
- PAN number already exists for this SP

### Step 4 — Preview Table
Displayed inline below the upload area after validation completes.

- Green rows: valid, will be imported
- Red rows: error with reason shown in a "Status" column (e.g., "PAN required", "Duplicate email", "Duplicate PAN")
- Header shows count: "47 valid · 3 errors"
- Two buttons: "Cancel" and "Import X valid rows"
- If ALL rows have errors, the import button is disabled

### Step 5 — Confirm & Import
On "Import X valid rows":
- For **users** (Team + Client): a "Default Password" field is shown in the UI (not in the template). Admin enters one password applied to all users in the batch. Min 8 characters. Supabase enforces password change on first login.
- Server action processes valid rows only, row by row
- Each user created with `user_metadata: { must_change_password: true }` (existing app pattern — matches single-user creation in `app/(sp)/users/actions.ts`)
- Client users get a `user_org_memberships` record linking them to their client org

### Step 6 — Summary
- Success banner: "47 clients imported successfully. 3 rows skipped."
- Admin can refer back to the preview table (still visible) to identify which rows need manual correction.

---

## Duplicate Detection

### Clients
Flag if either condition matches existing **active** (non-deleted) records for this SP:
- `name` matches case-insensitively → error: "Client name already exists"
- PAN number matches in `compliance_details` → error: "PAN already exists"
- Also detect duplicates within the upload file itself (same name or same PAN in two rows)

### Team Users & Client Users
- `email` already exists in Supabase Auth (globally) → error: "Email already registered"
- Also detect duplicate emails within the upload file

---

## Passwords (Users Only)

- No password column in the template — avoids passwords stored in plain-text Excel files
- Single "Default Password" input in the upload UI, shown at the Confirm step
- One password applied to all users in the batch
- Minimum 8 characters (same as single-user creation)
- Supabase `force_password_change = true` set on all bulk-created users
- Admin communicates login details to users manually (consistent with existing flow)

---

## Audit Logging

One `logAction` call per successful import batch — not one per row:

```
action: "bulk_import"
entityType: "client" | "sp_user" | "client_user"
entityLabel: "Bulk imported 47 clients"
```

This keeps the audit log readable for large imports.

---

## Additional Constraints

- **Row limit:** 500 rows per upload (prevent server timeouts)
- **File size limit:** 5 MB (consistent with `org-files` bucket limit)
- **File type:** `.xlsx` only (`.csv` not supported — dropdowns require Excel format)
- **Attachments:** Not supported in bulk import (logos, PAN scans, Aadhaar scans) — use individual edit forms
- **sp_admin only:** `sp_staff` cannot see or use the Bulk Import tab
- **Tenant isolation:** All imported records tagged with `service_provider_id` of the authenticated user's SP

---

## Files to Create / Modify

### New Files
- `components/sp/BulkImportClient.tsx` — main client component (tab with 3 import cards, upload flow, preview table)
- `app/(sp)/settings/bulk-import-actions.ts` — server actions: `validateBulkClients`, `validateBulkUsers`, `importBulkClients`, `importBulkUsers`
- `lib/bulk-import/template-generator.ts` — client-side Excel generation with `exceljs`
- `lib/bulk-import/validators.ts` — shared validation logic (mandatory checks, format checks, duplicate detection)

### Modified Files
- `app/(sp)/settings/page.tsx` — fetch active client orgs for the SP (needed for Client User template generation) and pass to `BulkImportClient`; render `BulkImportClient` below `SpApiSettingsClient` for `sp_admin` only

### New Dependency
- `exceljs` — for Excel generation with data validation (dropdown support). The existing `xlsx` library does not support Excel data validation natively.

---

## Verification

1. Download each template → open in Excel/Numbers → confirm dropdowns work on Business Type, State, Role, Client Organisation columns
2. Fill template with a mix of valid rows, missing-mandatory rows, and duplicate rows → upload → confirm preview table shows correct green/red split
3. Confirm import → check Supabase: clients appear under correct SP, users can log in with default password, forced to change on first login
4. Client User: confirm `user_org_memberships` row created linking user to correct client org
5. Upload a file with 0 valid rows → confirm import button is disabled
6. Upload a file with 501 rows → confirm rejection with row limit error
7. Check audit log shows single batch entry, not per-row entries
8. Re-download Client User template after adding a new client → confirm new client appears in dropdown
