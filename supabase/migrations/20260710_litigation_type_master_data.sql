-- Converts Litigation Type from a hardcoded global list into a master-data
-- field nested per Act (mirrors how Proceeding Type already works). Adds a
-- proper FK column, seeds default Litigation Types under the 3 named Acts,
-- and backfills existing appeals.litigation_type (text) values into the new
-- column where an exact name+act match exists.
--
-- The old `litigation_type` text column is intentionally KEPT (unused going
-- forward) — this migration never writes to or drops it beyond reading it
-- once for the backfill, so it stays available as a safety net.
--
-- Idempotent: safe to re-run. Live act names verified directly against the
-- Supabase project before writing this (Documents/backup.sql is stale and
-- was not used as a source of truth for names/UUIDs).

ALTER TABLE appeals ADD COLUMN IF NOT EXISTS litigation_type_id uuid REFERENCES master_records(id);

-- ── Seed: The Income-tax Act, 1961 ──────────────────────────────────────────
DO $$
DECLARE
  v_act_id uuid;
  v_items text[] := ARRAY[
    'Scrutiny Proceedings',
    'TDS Proceedings u/s 195',
    'Regular TDS Proceedings',
    'Reassessment',
    'Call for Information u/s 133(6)',
    'Intimation u/s 143(1)'
  ];
  v_name text;
  v_order integer := 1;
BEGIN
  SELECT id INTO v_act_id FROM master_records
  WHERE type = 'act_regulation' AND level = 'platform' AND deleted_at IS NULL
    AND name = 'The Income-tax Act, 1961'
  ORDER BY is_active DESC, created_at DESC LIMIT 1;

  IF v_act_id IS NOT NULL THEN
    FOREACH v_name IN ARRAY v_items LOOP
      INSERT INTO master_records (name, type, level, parent_id, sort_order)
      SELECT v_name, 'litigation_type', 'platform', v_act_id, v_order
      WHERE NOT EXISTS (
        SELECT 1 FROM master_records
        WHERE type = 'litigation_type' AND parent_id = v_act_id AND name = v_name
      );
      v_order := v_order + 1;
    END LOOP;
  END IF;
END $$;

-- ── Seed: The Income-tax Act, 2025 ──────────────────────────────────────────
DO $$
DECLARE
  v_act_id uuid;
  v_items text[] := ARRAY[
    'Scrutiny Proceedings',
    'TDS Proceedings u/s for payments to NR',
    'TDS Proceedings u/s for payments to R',
    'Reassessment',
    'Call for Information u/s 252',
    'Intimation u/s 270(1)'
  ];
  v_name text;
  v_order integer := 1;
BEGIN
  SELECT id INTO v_act_id FROM master_records
  WHERE type = 'act_regulation' AND level = 'platform' AND deleted_at IS NULL
    AND name = 'The Income-tax Act, 2025'
  ORDER BY is_active DESC, created_at DESC LIMIT 1;

  IF v_act_id IS NOT NULL THEN
    FOREACH v_name IN ARRAY v_items LOOP
      INSERT INTO master_records (name, type, level, parent_id, sort_order)
      SELECT v_name, 'litigation_type', 'platform', v_act_id, v_order
      WHERE NOT EXISTS (
        SELECT 1 FROM master_records
        WHERE type = 'litigation_type' AND parent_id = v_act_id AND name = v_name
      );
      v_order := v_order + 1;
    END LOOP;
  END IF;
END $$;

-- ── Seed: The Central Goods and Services Tax Act, 2017 ──────────────────────
DO $$
DECLARE
  v_act_id uuid;
  v_items text[] := ARRAY[
    'Scrutiny Proceedings u/s 61',
    'Assessment Notice to Non-filer u/s 62',
    'Assessment of Unregistered Person u/s 63',
    'Assessment in Special Cases u/s 64',
    'Audit u/s 65',
    'Inspection/Search Authorization u/s 67',
    'Summons u/s 70',
    'Notice for Detention/Seizure of Goods',
    'Confiscation Notice'
  ];
  v_name text;
  v_order integer := 1;
BEGIN
  SELECT id INTO v_act_id FROM master_records
  WHERE type = 'act_regulation' AND level = 'platform' AND deleted_at IS NULL
    AND name = 'The Central Goods and Services Tax Act, 2017'
  ORDER BY is_active DESC, created_at DESC LIMIT 1;

  IF v_act_id IS NOT NULL THEN
    FOREACH v_name IN ARRAY v_items LOOP
      INSERT INTO master_records (name, type, level, parent_id, sort_order)
      SELECT v_name, 'litigation_type', 'platform', v_act_id, v_order
      WHERE NOT EXISTS (
        SELECT 1 FROM master_records
        WHERE type = 'litigation_type' AND parent_id = v_act_id AND name = v_name
      );
      v_order := v_order + 1;
    END LOOP;
  END IF;
END $$;

-- ── Backfill: match existing appeals.litigation_type (text) to the newly
--    seeded master records by exact name + parent act. Non-destructive —
--    rows with no match are left null; the old text column is untouched.
UPDATE appeals a
SET litigation_type_id = lt.id
FROM master_records lt
WHERE a.litigation_type_id IS NULL
  AND a.litigation_type IS NOT NULL
  AND a.act_regulation_id IS NOT NULL
  AND lt.type = 'litigation_type'
  AND lt.deleted_at IS NULL
  AND lt.parent_id = a.act_regulation_id
  AND lt.name = a.litigation_type;
