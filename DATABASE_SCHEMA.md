# AppealDesk — Database Schema

High-level Supabase/PostgreSQL schema. Incorporates fixes from the May 2026 architecture review:
consolidated documents table, dead tables removed, scalar/array column duplication resolved,
`event_type` default corrected, inline file columns removed from `forms`.

---

## Table Groups

- [Group 1 — Identity & Access](#group-1-identity--access)
- [Group 2 — Master / Lookup Data](#group-2-master--lookup-data)
- [Group 3 — Core Litigation Hierarchy](#group-3-core-litigation-hierarchy)
- [Group 4 — Documents (Consolidated)](#group-4-documents-consolidated)
- [Group 5 — Financial](#group-5-financial)
- [Group 6 — Documents Library](#group-6-documents-library)
- [Group 7 — Compliance & Settings](#group-7-compliance--settings)
- [Group 8 — Audit](#group-8-audit)
- [Key Indexes](#key-indexes)
- [Changes vs. Previous Schema](#changes-vs-previous-schema)
- [RLS Summary](#rls-summary)

---

## Group 1: Identity & Access

```
organizations
├── id                  uuid PK          gen_random_uuid()
├── name                text NOT NULL
├── type                org_type         ENUM: service_provider | client
├── parent_sp_id        uuid → organizations   -- null for SP orgs
├── pan                 text
├── tan                 text
├── gst                 text
├── is_active           bool             DEFAULT true
├── deleted_at          timestamptz
└── created_at          timestamptz      DEFAULT now()

users
├── id                  uuid PK → auth.users
├── org_id              uuid → organizations   -- SP org for SP users, client org for client users
├── name                text NOT NULL
├── email               text UNIQUE NOT NULL
├── role                user_role        ENUM: super_admin | platform_admin | sp_admin | sp_staff | client_admin | client_user
├── designation         text
├── is_active           bool             DEFAULT true
├── deleted_at          timestamptz
└── created_at          timestamptz      DEFAULT now()

user_org_memberships                     -- client user ↔ client org (multi-org support)
├── id                  uuid PK
├── user_id             uuid → users
├── org_id              uuid → organizations
├── service_provider_id uuid → organizations
├── is_active           bool             DEFAULT true
└── created_at          timestamptz      DEFAULT now()

UNIQUE (user_id, org_id)
```

---

## Group 2: Master / Lookup Data

```
master_records                           -- acts, financial years, assessment years, proceeding types, etc.
├── id                  uuid PK          gen_random_uuid()
├── type                text NOT NULL    -- act_regulation | financial_year | assessment_year | proceeding_type
├── level               master_level     ENUM: platform | service_provider
├── service_provider_id uuid → organizations   -- null for platform-level records
├── parent_id           uuid → master_records  -- hierarchy support
├── name                text NOT NULL
├── sort_order          int
├── is_active           bool             DEFAULT true
├── deleted_at          timestamptz
└── created_at          timestamptz      DEFAULT now()

-- Platform-level records are shared across all SP tenants (acts, standard FY/AY values).
-- SP-level records are private to that SP.
```

---

## Group 3: Core Litigation Hierarchy

```
appeals
├── id                  uuid PK          gen_random_uuid()
├── service_provider_id uuid NOT NULL → organizations
├── client_org_id       uuid NOT NULL → organizations
├── act_regulation_id   uuid → master_records
├── financial_year_id   uuid → master_records
├── assessment_year_id  uuid → master_records
├── status              text NOT NULL    DEFAULT 'open'
├── litigation_type     text             (fixed 6-value list, app-enforced, nullable)
├── created_by          uuid NOT NULL → users
├── deleted_at          timestamptz
└── created_at / updated_at  timestamptz

proceedings
├── id                  uuid PK          gen_random_uuid()
├── appeal_id           uuid NOT NULL → appeals
├── service_provider_id uuid NOT NULL → organizations
├── proceeding_type_id  uuid → master_records
├── authority_type      text
├── authority_name      text
├── jurisdiction        text
├── jurisdiction_city   text
├── importance          text
├── mode                text
├── status              text NOT NULL    DEFAULT 'open'
├── initiated_on        date
├── to_be_completed_by  date
├── assigned_to_ids     uuid[]           DEFAULT '{}'   -- ⚠ array; scalar assigned_to removed
├── client_staff_ids    uuid[]           DEFAULT '{}'   -- ⚠ array; scalar client_staff_id removed
├── possible_outcome    text
├── deleted_at          timestamptz
└── created_at / updated_at  timestamptz

proceeding_client_users                  -- which client users can view a specific proceeding
├── proceeding_id       uuid → proceedings   PK (composite)
├── user_id             uuid → users         PK (composite)
└── created_at          timestamptz

events
├── id                  uuid PK          gen_random_uuid()
├── proceeding_id       uuid NOT NULL → proceedings
├── service_provider_id uuid NOT NULL → organizations
├── event_type          text NOT NULL    DEFAULT 'main'   -- ⚠ fixed (was 'master')
├── parent_event_id     uuid → events    -- null for main events; set for sub-events
├── category            event_category   ENUM (hearing | scn | order | ...)
├── event_date          timestamptz
├── event_notice_number text             -- "Order Number" in UI
├── description         text
├── details             jsonb            DEFAULT '{}'   -- category-specific date fields + category_name for "others"
├── status              text NOT NULL    DEFAULT 'open'
├── created_by          uuid NOT NULL → users
├── deleted_at          timestamptz
└── created_at / updated_at  timestamptz
```

---

## Group 4: Documents (Consolidated)

> Replaces the five previous tables: `appeal_documents`, `proceeding_documents`,
> `event_documents`, `event_attachments` (dead), and the legacy inline file pattern.

```
documents
├── id                  uuid PK          gen_random_uuid()
├── service_provider_id uuid NOT NULL → organizations
├── entity_type         text NOT NULL    -- 'appeal' | 'proceeding' | 'event'
├── entity_id           uuid NOT NULL    -- ID of the parent appeal / proceeding / event
├── file_name           text NOT NULL
├── file_url            text NOT NULL
├── file_type           text
├── file_size           bigint
├── description         text
├── uploaded_by         uuid NOT NULL → users
├── deleted_at          timestamptz
└── created_at          timestamptz      DEFAULT now()

INDEX on (entity_type, entity_id)
INDEX on (service_provider_id)
```

> `entity_id` is a polymorphic FK (no hard foreign key constraint). RLS uses
> `service_provider_id` for isolation — same pattern as all other SP-scoped tables.

---

## Group 5: Financial

```
expenses
├── id                  uuid PK          gen_random_uuid()
├── appeal_id           uuid NOT NULL → appeals
├── service_provider_id uuid NOT NULL → organizations
├── expense_type        text NOT NULL
├── amount              numeric NOT NULL
├── attachment_url      text
├── notes               text
├── created_by          uuid NOT NULL → users
└── created_at          timestamptz      DEFAULT now()

time_entries
├── id                  uuid PK          gen_random_uuid()
├── appeal_id           uuid NOT NULL → appeals
├── service_provider_id uuid NOT NULL → organizations
├── team_member_id      uuid NOT NULL → users
├── hours               numeric NOT NULL
├── notes               text
└── created_at          timestamptz      DEFAULT now()
```

---

## Group 6: Documents Library

```
forms                                    -- Income Tax Rules reference library
├── id                  uuid PK          gen_random_uuid()
├── service_provider_id uuid → organizations
├── rule_no             text
├── rule_heading        text             -- "Form Description" in UI
├── form_no             text
├── page_no             text             -- "Section" in UI
├── parallel_rule       text
├── url                 text
├── sort_order          int
└── created_at          timestamptz      DEFAULT now()

-- ⚠ No inline file columns. All form files stored in form_files table.

form_files
├── id                  uuid PK          gen_random_uuid()
├── form_id             uuid NOT NULL → forms  ON DELETE CASCADE
├── file_name           text NOT NULL
├── file_url            text NOT NULL
├── file_type           text
├── file_size           bigint
└── created_at          timestamptz      DEFAULT now()

templates
├── id                  uuid PK          gen_random_uuid()
├── service_provider_id uuid NOT NULL → organizations
├── name                text NOT NULL
├── description         text
├── file_url            text NOT NULL
├── file_type           text
├── file_size           bigint
├── created_by          uuid → users
└── created_at / updated_at  timestamptz

resources
├── id                  uuid PK          gen_random_uuid()
├── service_provider_id uuid NOT NULL → organizations
├── act_id              uuid NOT NULL → master_records
├── section             text
├── rule                text
├── description         text NOT NULL
├── author              text
├── created_by          uuid → users
└── created_at / updated_at  timestamptz

resource_files
├── id                  uuid PK          gen_random_uuid()
├── resource_id         uuid NOT NULL → resources  ON DELETE CASCADE
├── file_name           text NOT NULL
├── file_url            text NOT NULL
├── file_type           text
├── file_size           bigint
└── created_at          timestamptz      DEFAULT now()
```

---

## Group 7: Compliance & Settings

```
compliance_details
├── id                  uuid PK          gen_random_uuid()
├── org_id              uuid NOT NULL → organizations
├── type                compliance_type  ENUM
├── number              text
├── login_id            text
├── credential          text             ⚠ ENCRYPT THIS (pgcrypto or secrets vault)
├── attachment_url      text
└── created_at / updated_at  timestamptz

UNIQUE (org_id, type)

platform_settings
├── id                  uuid PK          gen_random_uuid()
├── key                 text UNIQUE NOT NULL
├── value               jsonb
└── updated_at          timestamptz
```

---

## Group 8: Audit

```
audit_logs                               -- immutable; replaces the dead activity_logs table
├── id                  uuid PK          gen_random_uuid()
├── service_provider_id uuid NOT NULL → organizations
├── actor_id            uuid → users     -- nullable: platform-level actions have no SP actor
├── action              text NOT NULL
├── entity_type         text NOT NULL
├── entity_label        text             -- human-readable snapshot (e.g. "Appeal #ITD/2024/001")
└── created_at          timestamptz      DEFAULT now()

-- RLS: no UPDATE or DELETE policies (append-only / immutable by policy)
-- INSERT restricted to service_provider_id = get_my_sp_id()
```

---

## Key Indexes

```sql
-- Soft-delete: partial indexes (only index live rows — small and fast)
CREATE INDEX ON appeals(deleted_at)          WHERE deleted_at IS NULL;
CREATE INDEX ON proceedings(deleted_at)      WHERE deleted_at IS NULL;
CREATE INDEX ON events(deleted_at)           WHERE deleted_at IS NULL;
CREATE INDEX ON organizations(deleted_at)    WHERE deleted_at IS NULL;
CREATE INDEX ON users(deleted_at)            WHERE deleted_at IS NULL;
CREATE INDEX ON documents(deleted_at)        WHERE deleted_at IS NULL;

-- Appeal list filters
CREATE INDEX ON appeals(service_provider_id);
CREATE INDEX ON appeals(client_org_id);
CREATE INDEX ON appeals(status);
CREATE INDEX ON appeals(financial_year_id);
CREATE INDEX ON appeals(assessment_year_id);
CREATE INDEX ON appeals(act_regulation_id);

-- Proceeding filters
CREATE INDEX ON proceedings(appeal_id);
CREATE INDEX ON proceedings(service_provider_id);
CREATE INDEX ON proceedings(status);
CREATE INDEX ON proceedings(proceeding_type_id);
CREATE INDEX ON proceedings USING GIN(assigned_to_ids);   -- array membership queries

-- Event filters
CREATE INDEX ON events(proceeding_id);
CREATE INDEX ON events(event_type);
CREATE INDEX ON events(parent_event_id);
CREATE INDEX ON events(status);
CREATE INDEX ON events(category);
CREATE INDEX ON events(event_date DESC NULLS LAST);

-- Consolidated documents
CREATE INDEX ON documents(entity_type, entity_id);
CREATE INDEX ON documents(service_provider_id);

-- Audit
CREATE INDEX ON audit_logs(service_provider_id);
CREATE INDEX ON audit_logs(actor_id);
CREATE INDEX ON audit_logs(created_at DESC);

-- Master records
CREATE INDEX ON master_records(type, level);
CREATE INDEX ON master_records(service_provider_id);
CREATE INDEX ON master_records(parent_id);

-- User lookups
CREATE INDEX ON users(org_id);
CREATE INDEX ON user_org_memberships(user_id);
CREATE INDEX ON user_org_memberships(service_provider_id);
```

---

## Changes vs. Previous Schema

| Change | Reason |
|---|---|
| `documents` replaces `appeal_documents` + `proceeding_documents` + `event_documents` + `event_attachments` | Eliminate duplication, single RLS policy, consistent structure |
| `activity_logs` dropped | Dead table — superseded by `audit_logs`, receives zero app writes |
| `event_attachments` dropped | Dead table — superseded by `event_documents`, zero app usage |
| `proceedings.assigned_to` (scalar) dropped | `assigned_to_ids[]` is the active column; scalar was leftover from single-assignee era |
| `proceedings.client_staff_id` (scalar) dropped | Same — use `client_staff_ids[]` |
| Inline file columns (`file_name`, `file_url`, `file_size`) dropped from `forms` | `form_files` table is the single source of truth for form attachments |
| `events.event_type` DEFAULT changed to `'main'` | Was `'master'` — incorrect value that corrupts new rows |
| All UUID defaults → `gen_random_uuid()` | Consistent; no `uuid-ossp` extension dependency |
| Partial indexes added on all `deleted_at` columns | Every list query filters `WHERE deleted_at IS NULL` — previously caused full table scans |
| `audit_logs` INSERT policy scoped to `get_my_sp_id()` | Previously `WITH CHECK (true)` allowed cross-SP writes |

---

## RLS Summary

All tables use Row Level Security. The core isolation pattern:

```sql
-- SP users see their own SP's data
service_provider_id = get_my_sp_id()

-- Platform admins see everything
OR get_my_role() IN ('super_admin', 'platform_admin')

-- Client users see data linked to their orgs (via appeals chain)
OR client_org_id = get_my_org_id()
OR client_org_id IN (SELECT org_id FROM user_org_memberships WHERE user_id = auth.uid() AND is_active = true)
```

**Critical helper functions** (PostgreSQL, called by every RLS policy):

| Function | Returns |
|---|---|
| `get_my_sp_id()` | The SP org ID for the current user (resolves parent for client users) |
| `get_my_org_id()` | The direct org ID from `users.org_id` |
| `get_my_role()` | The `user_role` enum value from `users.role` |

> These three functions are the single point of failure for tenant isolation.
> Any bug in `get_my_sp_id()` breaks all RLS across all tables simultaneously.
> Test them thoroughly when adding new user types or org structures.

---

## Entity Relationship (Text Diagram)

```
platform_settings       master_records (platform)
                              │
organizations (SP) ───────────┤
    │                         │ master_records (SP)
    ├── organizations (client) │
    │       │                 │
    │   user_org_memberships  │
    │                         │
    users ───────────────────────────────────────────────┐
    │                                                     │
    └── appeals ──────────────────────────────────────── ┤
            │  └── financial_year (master_records)        │
            │  └── assessment_year (master_records)       │
            │  └── act_regulation (master_records)        │
            │                                             │
            ├── proceedings ──────────────────────────── ┤
            │       │  └── proceeding_type (master_records)│
            │       ├── proceeding_client_users           │
            │       └── events ──────────────────────── ┤
            │               └── events (sub, self-ref)    │
            │                                             │
            ├── documents (entity_type='appeal')          │
            ├── documents (entity_type='proceeding')      │
            ├── documents (entity_type='event')           │
            ├── expenses                                  │
            └── time_entries                              │
                                                          │
    forms ──── form_files                                 │
    templates                                             │
    resources ── resource_files                           │
    compliance_details                                    │
    audit_logs ───────────────────────────────────────────┘
```
