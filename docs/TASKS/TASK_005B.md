# TASK_005B — Manual Entry, History, and the Legacy-Entry Product Rule

**Status:** READY TO START
**Priority:** P0

## Architecture Status

TASK_005 Architecture: **FROZEN**, including the Step 0 synchronization in
`docs/TASKS/TASK_005_ARCHITECTURE.md` §10 (legacy entry is blocked, not
warned — resolved during architecture review, not a decision made here).
Implementation must conform to it exactly. Any further architectural
change requires an explicit review and update of that document first, not
an ad hoc change during coding.

## Goal

Give the publisher two ways to record ministry time going forward —
**Manual Entry** and (later, TASK_005C) **Timer** — and a place to review
what's been recorded (**History**), while enforcing the already-approved
product rule that the legacy monthly `HourRecord` workflow can no longer
collide with `Session` data for the same month.

## Scope

### Routing
- `app/entry.tsx` and `app/history.tsx` — new flat top-level routes,
  siblings of the existing `app/service.tsx`, same
  SafeAreaView/back-button header style already used there.
- `app/service.tsx`: "Добавить время" → `router.push("/entry")`,
  "История" → `router.push("/history")`. "Таймер"/"Статистика" stay as
  Alert placeholders (TASK_005C/TASK_005E).
- `app/(tabs)/hours/` nested-stack layout is **not** part of this task —
  that's TASK_005D's restructuring of `service.tsx` into the Hours module.

### Manual Entry (`app/entry.tsx`)
- New `src/components/forms/SessionForm.tsx` — parallel to `RecordForm`,
  not a replacement. Fields: date (default today), duration in minutes,
  optional note. No `startTime`/`endTime` (manual sessions per
  architecture §6).
- Create and edit (`app/entry.tsx?id=...`) via the existing `saveSession()`
  from `StoreContext` — no `StoreContext` changes needed.
- Delete via the same `Alert.alert` confirmation pattern already used for
  records/events.

### History (`app/history.tsx`)
- Reverse-chronological, grouped Service Year → Month, reusing the Hours
  screen's existing visual language (this introduces Session history, not
  a new visual language).
- One row per `Session` within its month (date, duration, note); tap →
  `app/entry.tsx?id=...`; long-press → delete with confirmation.
- One collapsed, non-interactive row per legacy month (a month with a
  `HourRecord` and zero `Session`s) for continuity with Hours. Tapping it
  does nothing in this task — no Month Details yet (TASK_005D).

### Product rule enforcement (already approved — see Step 0 sync)
- A single shared predicate in the aggregation layer
  (`src/data/constants.ts`) determines whether the legacy `HourRecord`
  workflow may save for a given (year, month): blocked for the current
  calendar month, any future month, or any past month with ≥1 `Session`;
  otherwise editable.
- `RecordForm` (the one shared component reached from `app/(tabs)/add.tsx`,
  `app/(tabs)/hours.tsx`, and Home's `index.tsx`) calls this predicate and
  shows a clear inline explanation instead of saving when blocked — not a
  dismissible warning, not a silent failure. The condition itself is
  evaluated in exactly one place; no screen re-implements it.
- `add.tsx`, `hours.tsx`, and Home's `index.tsx` are updated only to the
  extent needed to supply `sessions` to `RecordForm` (a mechanical prop,
  not a behavior change) — Home's own month-tap logic, added in the
  TASK_005A addendum, is untouched.

## Non-Goals

- No Timer (TASK_005C). No Statistics, Charts, Heat Map, Pace, or
  Projection (TASK_005E).
- No `app/(tabs)/hours/` restructuring, no Month Details screen (both
  TASK_005D).
- No `StoreContext` changes, no `Session` model changes, no
  aggregation-layer redesign — `monthTotal`/`sessionsForMonth`/
  `serviceYearAggregation` from TASK_005A are used as-is, not modified.
- No Home behavior/UI changes — only the mechanical `sessions` prop
  threading described above.
- No deploy, no Git tag.

## Definition of Done

- Step 0 (architecture doc sync) landed as its own commit before any code.
- This document exists before any implementation code.
- Manual Entry: create, edit, duration-only input, delete — all working
  through `saveSession()`.
- History: grouped by Service Year → Month, reverse-chronological, edit
  and delete working, legacy rows present but inert.
- Legacy `HourRecord` entry is blocked exactly for: current month, future
  months, past months containing ≥1 `Session` — and remains editable for
  past months with zero `Session`s. Enforced from a single predicate, not
  duplicated per screen.
- Automated tests cover all four blocking cases (current / future / past
  with session / past without session), plus Manual Entry and History
  behavior.
- No regression to TASK_005A aggregation behavior. Specifically verified:
  after creating one `Session` for the current month, Home's `TodayCard`
  and current-service-year grid reflect the `Session` total, while the
  Hours screen continues to render from its existing (frozen)
  `groupBySY()`/`hoursForMonth()` contract until TASK_005D — this is
  expected, not a bug, and is covered by an automated test.
- Hours screen and Home preserve their existing UI/behavior except for the
  approved legacy-entry blocking rule.
- Full test suite and `tsc --noEmit` both pass.
- Commit(s) pushed. No deploy, no Git tag — TASK_005B requires the
  Architecture Review Checklist (ADR-007) before either.
