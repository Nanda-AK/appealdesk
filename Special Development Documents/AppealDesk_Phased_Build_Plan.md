# AppealDesk — Phased Build Plan

**Project:** AppealDesk — Multi-Tenant Appeal Management Platform
**Date:** 2026-04-14
**Tech Stack:** Next.js + Supabase + Tailwind CSS + Vercel

---

## Phase 0 — Foundation (Week 1–2)
**Goal: Everything subsequent phases depend on**

- New Next.js project setup (`appealdesk`)
- Database schema design — multi-tenant from day 1
  - `organizations`, `users`, `user_org_memberships`
  - `appeals`, `proceedings`, `events`
  - `master_records`, `activity_logs`
- Supabase setup — RLS policies with `service_provider_id` scoping
- Auth + proxy middleware — role-aware routing
- Design system — theme, layout shell, sidebar
- GitHub repo + Vercel deployment pipeline

**Deliverable:** Blank app that logs in, routes by role, enforces tenant isolation

---

## Phase 1 — Platform Admin (Week 3–4)
**Goal: Platform team can manage the system**

- Platform Admin layout (`/platform/*`)
- Platform dashboard — total SPs, users, appeals count
- Service Provider management — list, view, activate/deactivate
- SP onboarding form — basic info, address, compliance details, logo upload
- Platform Admin user management — create, activate/deactivate
- Global Master Records — business types, default values

**Deliverable:** Platform Admin can onboard a Service Provider end to end

---

## Phase 2 — SP Workspace Foundation (Week 5–6)
**Goal: SP Admin can set up their workspace**

- SP dashboard — appeals summary, status distribution
- User management — create SP staff + client users, profile fields, email activation
- Client management — onboard clients, compliance details, document uploads
- SP-level Master Records — custom values extending global defaults

**Deliverable:** SP Admin can set up their firm, add staff and clients

---

## Phase 3 — Appeals Core (Week 7–9)
**Goal: The main workflow — most complex phase**

- Appeals list — filters, pagination, role-scoped
- Create / Edit Appeal — client, act, assessment year
- Proceedings — create/edit under an appeal, all fields including Importance + Possible Outcome
- Events — all 9 categories with category-specific fields
- Timeline view — chronological events per proceeding
- Document attachments per event

**Deliverable:** Full appeal lifecycle can be tracked from notice to order

---

## Phase 4 — Appeals Extended (Week 10)
**Goal: Value-add features on top of appeals**

- Time tracking per appeal — member, activity, date, duration
- Expense tracker per appeal — type, amount, attachment
- Appeal view for client users — read-only, scoped to their org

**Deliverable:** Complete appeals module matching full PRD

---

## Phase 5 — Documents Module (Week 11)
**Goal: Reference library for SP teams**

- Forms tab — IT Rules reference table, admin CRUD
- Templates tab — file upload, metadata, admin CRUD
- Scoped per SP (each SP manages their own)

**Deliverable:** Documents module migrated and enhanced from MVP

---

## Phase 6 — Client Portal (Week 12)
**Goal: Client user experience**

- Multi-SP combined appeals view
- `user_org_memberships` — link one client user to multiple SPs
- Auto-routing — no manual SP selection
- Profile page — all users can view/edit their own profile

**Deliverable:** Client logs in and sees all their appeals across all CA firms

---

## Phase 7 — Notifications + Logs (Week 13)
**Goal: Awareness and accountability**

- Email notifications — account activation, hearing date reminders
- Activity logs — track actions per SP (who did what, when)
- SP Admin can view logs for their workspace

**Deliverable:** System sends emails, SP Admin has audit visibility

---

## Phase 8 — Migration + Launch (Week 14–15)
**Goal: Go live with existing MSSV data**

- Migrate MSSV & Co data from MVP → AppealDesk
- MSSV onboarded as first SP via Platform Admin
- End-to-end testing across all roles
- Performance testing — indexes, pagination, RLS query cost
- VPS / Vercel production deployment
- Handover + training for MSSV team

**Deliverable:** Live system, MSSV running on AppealDesk

---

## Summary

| Phase | Focus | Weeks |
|---|---|---|
| 0 | Foundation + Schema | 1–2 |
| 1 | Platform Admin | 3–4 |
| 2 | SP Workspace | 5–6 |
| 3 | Appeals Core | 7–9 |
| 4 | Appeals Extended | 10 |
| 5 | Documents | 11 |
| 6 | Client Portal | 12 |
| 7 | Notifications + Logs | 13 |
| 8 | Migration + Launch | 14–15 |

**Total: ~15 weeks** for a fully production-ready multi-tenant platform.
