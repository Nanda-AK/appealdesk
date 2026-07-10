-- Adds the "Litigation Type" field to appeals. Nullable, no default, no CHECK
-- constraint — the fixed 6-value list is enforced app-side only (same
-- enforcement philosophy as the existing `status` column), and existing rows
-- are intentionally left null (no backfill).

ALTER TABLE appeals ADD COLUMN IF NOT EXISTS litigation_type text;
