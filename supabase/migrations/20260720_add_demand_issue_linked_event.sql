-- Adds a stable link from a demand issue to the Main Event (proceedings.events)
-- it was raised from. Previously the Demand tab's "Notice No." field stored a
-- frozen copy of the event's DIN (event_notice_number) at selection time, with
-- no persisted reference back to the event itself. That caused two bugs:
--   1. Editing the linked event's DIN afterwards never propagated back to the
--      demand issue — notice_no was a one-time snapshot, not a live value.
--   2. Reopening the Edit Proceeding modal lost the ME selection whenever the
--      event's DIN no longer matched the stale notice_no, since the only way
--      to re-derive "which event was selected" was matching DIN strings.
-- linked_event_id fixes both by giving the UI a stable id to re-select on
-- reload; notice_no/notice_date stay as denormalized display/export columns,
-- kept in sync with the linked event's live data from the app layer.
-- ON DELETE SET NULL: if the linked event is hard-deleted, the demand issue
-- (and its financial amounts) survive as an unlinked/manual entry rather than
-- being cascade-deleted.

ALTER TABLE proceeding_demand_issues
  ADD COLUMN IF NOT EXISTS linked_event_id uuid REFERENCES events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_proceeding_demand_issues_linked_event_id
  ON proceeding_demand_issues(linked_event_id);
