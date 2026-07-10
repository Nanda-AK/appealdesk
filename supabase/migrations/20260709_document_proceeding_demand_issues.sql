-- Documentation-only migration: proceeding_demand_issues already exists live in
-- Supabase but was created out-of-band and never captured in schema.sql /
-- DATABASE_SCHEMA.md / a migration file. This is a no-op against the live DB
-- (CREATE TABLE IF NOT EXISTS) — it exists purely to close that documentation gap
-- for the new Proceedings section, which reads from this table.
--
-- Columns inferred from lib/types.ts (DemandIssue/DemandIssueInput) and the
-- runtime queries in app/(sp)/litigations/demand-actions.ts. Verify actual live
-- column types/nullability before relying on this as a source of truth.

CREATE TABLE IF NOT EXISTS proceeding_demand_issues (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  proceeding_id        uuid NOT NULL REFERENCES proceedings(id) ON DELETE CASCADE,
  service_provider_id  uuid NOT NULL REFERENCES organizations(id),
  notice_no            text,
  notice_date          date,
  description          text,
  tax_demanded         numeric NOT NULL DEFAULT 0,
  tax_acceptable       numeric NOT NULL DEFAULT 0,
  tax_dropped          numeric NOT NULL DEFAULT 0,
  interest_demanded    numeric NOT NULL DEFAULT 0,
  interest_acceptable  numeric NOT NULL DEFAULT 0,
  interest_dropped     numeric NOT NULL DEFAULT 0,
  penalty_demanded     numeric NOT NULL DEFAULT 0,
  penalty_acceptable   numeric NOT NULL DEFAULT 0,
  penalty_dropped      numeric NOT NULL DEFAULT 0,
  sort_order           integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proceeding_demand_issues_proceeding_id
  ON proceeding_demand_issues(proceeding_id);
