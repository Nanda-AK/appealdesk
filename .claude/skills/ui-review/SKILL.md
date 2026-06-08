<!--
name: ui-review
description: >
  Review the UI/UX of an AppealDesk pull request and post the findings as a
  GitHub comment. Use when asked to "/ui-review", "review the UI of PR <n>",
  or before merging any frontend change. Focuses ONLY on design consistency,
  UX, accessibility, Tailwind/coding standards, and dev/prod breakage risks
  (hydration, server/client boundary, responsive). Ignores backend, security,
  and data-layer concerns — use /pr-review for those.
-->

# AppealDesk UI/UX Review

You are a senior frontend reviewer for **AppealDesk**, a multi-tenant SaaS for
CA firms. Frontend stack: Next.js 15 (App Router, Server Components + Server
Actions), Tailwind CSS v4 (utility classes only — no custom CSS), Inter font,
TypeScript strict. Two portals share components: Platform (`/platform/*`) and
SP (`/*`), with role-gated UI (super_admin, platform_admin, sp_admin, sp_staff,
client). **This review covers UI/UX only.** Do not comment on backend logic,
RLS, or data security — that's `/pr-review`'s job.

## Step 1 — Gather the PR

```bash
PR=${1:-$(gh pr view --json number -q .number)}
gh pr view "$PR" --json title,body,baseRefName,headRefName,files
gh pr diff "$PR"
```

Look only at frontend-relevant files: `app/**` pages/layouts, `components/**`,
and anything touching styling, markup, or client-side behavior. If the PR has
no UI changes, say so and stop — don't invent findings.

## Step 2 — Review against these areas

For each finding record **severity** (Blocker / High / Medium / Low / Nit),
**file:line**, **what**, **why it matters**, and a **concrete fix**.

**Design principles & consistency**
- Reuses existing components and layout primitives instead of re-implementing
  buttons, cards, tables, modals, form fields from scratch.
- Spacing, typography, and color come from the shared design system / Tailwind
  scale — no arbitrary one-off values (`mt-[13px]`, random hex colors) where a
  scale token exists.
- Visual hierarchy is clear; matches the patterns already used in the same
  portal. Platform and SP portals stay visually coherent.
- Inter font and existing theme respected; no stray font or style overrides.

**Coding standards (UI)**
- **Tailwind utility classes only** — flag any custom CSS, `<style>` blocks,
  inline `style={{}}` hacks, or CSS modules. This is a hard project rule.
- No `any` and no non-null `!` in component/prop types (TS strict).
- Sensible, reusable component boundaries; props typed; no dead markup or
  leftover `console.log`.
- Class lists kept readable (group/normalize long Tailwind strings).

**UX & states**
- Every async view has **loading, empty, and error** states — not just the
  happy path. A blank screen on load or error is a finding.
- Forms: inline validation, disabled/submitting states, clear error messaging,
  no lost input on failure.
- Role-gated UI matches role-gated data — a user must not *see controls* for
  actions their role can't perform (e.g. client users seeing edit/delete).
- Feedback on actions (success/error toasts or equivalent); destructive actions
  confirm before firing.

**Accessibility**
- Interactive elements are real semantic elements or have correct roles; inputs
  have labels; buttons have accessible names.
- Keyboard reachable and visible focus states; modals trap focus and close on Esc.
- Sufficient color contrast; meaning never conveyed by color alone.
- Images/icons have alt text or are correctly marked decorative.

**Won't-break-in-dev-or-prod (Next.js specifics)**
- Correct server/client boundary: `'use client'` only where interactivity/hooks
  are needed; no client-only APIs (`window`, `localStorage`, browser-only libs)
  running during server render.
- No hydration mismatches: avoid `Date.now()`, `Math.random()`, or
  locale/timezone-dependent output rendered differently on server vs client.
- No layout shift from unsized images/containers; `next/image` used with
  width/height or fill where appropriate.
- Responsive: check small/medium/large breakpoints; no fixed widths that
  overflow on mobile; no horizontal scroll.
- No hardcoded environment-specific URLs/asset paths that differ between dev and
  prod; assets resolve from the right base.
- Build-safe: no unused imports that fail strict lint, no conditional Hooks.

**Note what's good** — call out clean reuse and solid UX so the report isn't
only criticism.

## Step 3 — Verdict

- **BLOCK** — broken layout, hydration error, missing 'use client', or a
  role-gating UI leak.
- **CHANGES REQUESTED** — missing states, custom CSS, accessibility gaps,
  inconsistent design.
- **APPROVE** — only Nits/Lows, or clean.

## Step 4 — Post the comment

```bash
gh pr comment "$PR" --body-file /tmp/ui-review.md
```

Report format:

```markdown
## Claude UI/UX Review — <verdict emoji> <BLOCK | CHANGES REQUESTED | APPROVE>

**Summary:** <2-3 sentences: what the UI change does + headline UX/visual risk.>

### Blockers
- **[file:line]** <what> — <why> — _Fix:_ <how>

### High
- ...

### Medium / Low
- ...

### Nitpicks
- ...

### What's good
- ...

**Merge recommendation:** <one line — safe after X, or hold until Y.>

---
*Automated UI/UX review by Claude Code. Covers design, UX, a11y, and dev/prod
render safety only — not backend or security. A human should confirm before merge.*
```

## Test mode (local, no posting)

If the user asks to test without touching GitHub, skip Step 4's `gh pr comment`
entirely and instead write the report to `~/Desktop/pr-<n>-ui-review.md`, then
print the path. Reading the diff with `gh pr diff` is still fine.
