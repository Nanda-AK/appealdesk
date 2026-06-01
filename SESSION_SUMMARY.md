# Development Session Summary

> Snapshot of recent changes to kick off a structured dev session.
> Branch: `main` · Last updated: 2026-06-01

---

## 1. Platform Recycle Bin — Client delete/restore

Added soft-delete management for **client organizations** to the Platform Recycle Bin
(it previously handled only Service Providers, Users, and Masters).

| File | Change |
|------|--------|
| `app/(platform)/platform/recycle-bin/page.tsx` | Query deleted `type = "client"` orgs (30-day window); pass `clients` to client component |
| `app/(platform)/platform/recycle-bin/actions.ts` | New `restoreClient(id)` + `purgeClient(id)` — cascades to the org's users (restore reactivates; purge removes auth users + rows + org) |
| `components/platform/PlatformRecycleBinClient.tsx` | New `Client` interface/prop + a "Clients" section with restore + permanent-delete actions |

**Status:** ✅ Done, build passing.

---

## 2. Masters — allow `platform_admin` to delete

Delete of master records (Business Types, Financial Years, Assessment Years, Acts)
was gated to `super_admin` only, inconsistent with create/rename/toggle (which allow
`platform_admin`). Opened delete up to `platform_admin` in both UI and server action.

| File | Change |
|------|--------|
| `app/(platform)/platform/masters/actions.ts` | `deleteMasterRecord` now accepts `super_admin` **and** `platform_admin` |
| `app/(platform)/platform/masters/page.tsx` | Passes `canDelete` (true for both platform roles) instead of `isSuperAdmin` |
| `components/platform/MastersClient.tsx` | Renamed prop `isSuperAdmin` → `canDelete`; updated all 3 delete-button guards (flat tabs, Acts, proceedings) |

**Status:** ✅ Done, build passing.
**Note:** An Act still requires zero child proceedings before its delete button shows
(`canDelete && procs.length === 0`) — backend already cascades, so this guard can be
relaxed later if desired.

---

## 3. TaxVeteran logo not loading

### Code fix applied
| File | Change |
|------|--------|
| `next.config.ts` | Image `remotePatterns` hostname was hard-coded to the **old** Supabase project (`nwfviebtftwjgtawcbci`). Now derived from `NEXT_PUBLIC_SUPABASE_URL` so it can't drift again. |

### ⚠️ Root cause is data/infra, not code
The logo is still broken because of **stale data + an unseeded storage backend** on the
current Supabase project (`ulctjnzadowpxcxpnwdz`):

1. `platform_settings.logo_url` points to the **decommissioned** old project
   (`nwfviebtftwjgtawcbci.supabase.co`) — host no longer resolves (HTTP 000).
2. The current project has **no `org-files` bucket** (`"Bucket not found"`), so the file
   was never migrated and can't be re-uploaded until the bucket exists.

### Recovery steps (manual, in the **current** Supabase project)
1. **Create storage buckets** — run `supabase/storage.sql` in the SQL Editor (creates
   `org-files`, `appeal-documents`, `templates` + policies).
2. **Re-upload the logo** via **Platform → Settings** (super_admin) — this writes a fresh
   `logo_url` on the current host, which `next.config.ts` now whitelists automatically.
3. Verify: `/login` shows the logo and `/api/favicon` returns the image (not a 307 to
   `/favicon-default.svg`).

**Status:** 🟡 Config fixed; logo display blocked on manual storage re-seed + re-upload.

---

## Quick reference
- Run: `npm run dev` · Build: `npm run build` · Lint: `npm run lint`
- Env hostname (current): `ulctjnzadowpxcxpnwdz.supabase.co`
- Stale reference: `CLAUDE.md` still names the old host `nwfviebtftwjgtawcbci.supabase.co`
  (worth updating).
