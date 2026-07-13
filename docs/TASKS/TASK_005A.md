# TASK_005A — Hours 2.0: Session Data Layer

**Status:** READY TO START
**Priority:** P0

## Architecture Status

TASK_005 Architecture: **FROZEN**

Implementation must conform to the approved `TASK_005_ARCHITECTURE.md` and
the approved TASK_005A addendum.

The approved architecture is the single source of truth for this
implementation.

If an architectural constraint or deviation is discovered during
implementation:

1. Stop implementation.
2. Document the issue, including:
   - the technical constraint encountered;
   - why the approved architecture no longer fits;
   - the proposed alternative.
3. Review the architectural impact.
4. Update `TASK_005_ARCHITECTURE.md` (or create a new ADR) if the change is
   approved.
5. Resume implementation.

No ad hoc architectural changes are permitted during coding.

## Goal
Introduce `Session` as the new primary time-tracking entity and make
`hoursForMonth()` / `monthProgress()` / `groupBySY()` session-aware at
read time — with no UI, no changes to `HourRecord`/`seed.js`, and no
change to Home's visual design. Home's *data source* gets one narrowly
scoped exception to the TASK_004 freeze, described in the Addendum below:
it stops aggregating `HourRecord` directly and consumes the new
aggregation layer instead, so its service-year total and month grid are
correct once `Session` becomes the authoritative source for a month.

## Scope

### 1. Session type
Add to `src/types/index.ts`:
```ts
export type Session = {
  id: string;
  date: string;              // ISO day "YYYY-MM-DD"
  startTime?: string;         // ISO datetime; required when source === "timer"
  endTime?: string;            // ISO datetime; required when source === "timer"
  durationMinutes: number;      // authoritative duration; always required
  note?: string;
  source: "manual" | "timer";
  createdAt: string;
  updatedAt: string;
};
```
No `type`/credit-hour field — out of scope per architecture §6.

### 2. Storage
- New AsyncStorage key `mj_sessions_v1` in `StoreContext.tsx` (`KEYS.sessions`),
  using the existing `usePersistentState` pattern. Seed value: `[]`.
- Structure the key so a future `mj_sessions_v1` → `mj_sessions_v2` migration
  (per ADR-002) stays possible later — do not nest unrelated data under this
  key. No migration is implemented in this task.
- Update `docs/ARCHITECTURE.md`'s "Ключи хранилища" table to add
  `mj_sessions_v1` alongside the existing three keys. Required for DoD.

### 3. StoreContext additions
Mirror the existing `records`/`saveRecord`/`deleteRecord` pattern exactly:
```ts
export type SessionInput = {
  id?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  note?: string;
  source: "manual" | "timer";
};
```
- `sessions: Session[]`
- `saveSession(input: SessionInput): void` — id absent → create (generate
  id, `createdAt`, `updatedAt`); id present → update (preserve `createdAt`,
  refresh `updatedAt`).
- `deleteSession(id: string): void`

### 4. Aggregation logic
Pure functions in `src/data/constants.ts` (or a new `src/data/sessions.ts`
if that keeps the file focused — implementer's call, no new file is
required):
- `monthTotal(records, sessions, year, month): number` — sum of
  `durationMinutes` (converted to hours) for the month if any `Session`
  exists for it; otherwise the matching `HourRecord.hours ?? 0`. Never
  combines both sources for the same month (architecture §7–§8).
- `sessionsForMonth(sessions, year, month): Session[]`
- Upgrade `hoursForMonth()` to call `monthTotal()` internally — same
  signature, same return type/units as today.
- Upgrade `monthProgress()` and `groupBySY()` the same way — same
  signatures, same call sites in Home and the existing Hours screen
  untouched.

## Explicitly not in scope
- No UI screens (Manual Entry, Timer, History, Dashboard, Stats are
  TASK_005B–005E).
- No migration, conversion, or synchronization of `HourRecord` into
  `Session`; no synthetic `Session` records generated from `HourRecord`.
- No changes to `seed.js`.
- No changes to Home's layout, styling, spacing, navigation, or visual
  behavior. `TodayCard.tsx`/`UpcomingEventsCard.tsx` are untouched.
  `index.tsx`'s data-fetching call sites change per the Addendum below
  (a narrowly scoped, explicitly approved exception to the TASK_004
  freeze) — nothing else about Home changes.
- The Hours screen (`app/(tabs)/hours.tsx`) is not migrated to the new
  aggregation layer in this task — see Addendum, Non-Goals. It keeps
  calling `groupBySY()`/`hoursForMonth()` exactly as today; that contract
  must not be renamed or altered by this task. Migrating the Hours screen
  itself is deferred to TASK_005D.

## Rules
- Follow `docs/TASKS/TASK_005_ARCHITECTURE.md` exactly.
- `HourRecord` and `seed.js` remain untouched.
- Repository must remain buildable after this commit.
- One logical stage, one commit.

## Completion Criteria — Session Data Layer
- `Session` type defined; `mj_sessions_v1` wired through `StoreContext`
  with `sessions`, `saveSession`, `deleteSession`.
- `docs/ARCHITECTURE.md` updated with the new storage key.
- `monthTotal()` correctly resolves: (a) a month with only legacy
  `HourRecord` data → unchanged result, (b) a month with only `Session`
  data → sum of `durationMinutes` in hours. (No month in current data has
  both — untested by real data, but the "Session wins" rule per §8 must
  hold in the implementation.)
- `hoursForMonth()` / `monthProgress()` / `groupBySY()` keep their existing
  signatures and return the same values as before this task against
  today's all-legacy data (regression check).
- The existing Hours screen renders identically to before this task — no
  visible change, since this task is data-layer only for that screen.
- App builds and runs with no new TypeScript errors.

---

## Addendum — Home Service-Year ViewModel

*Resolves the Home-integration follow-up flagged in
`TASK_005_ARCHITECTURE.md` §11. Does not modify the approved TASK_005
architecture — it completes the aggregation layer required to make the
already-approved Session-first architecture internally consistent.*

### Background

Home currently computes the current service-year total and month grid
directly from `HourRecord[]`. Once `Session` becomes the authoritative
source for a month (per architecture §§7–10), this produces incorrect
totals and an outdated editing path. This addendum is a narrowly scoped
exception to the Home freeze, required by the new functionality — **the
Home UI itself remains unchanged; only its data source evolves.**

### Aggregation layer

Introduce a dedicated aggregation layer responsible for all read-time
calculations spanning `HourRecord` and `Session`. No specific file name or
location is prescribed — its job is to provide a stable API for
higher-level UI while hiding the underlying storage model. It becomes the
single source for:
- `monthTotal()`
- `hoursForMonth()`
- `monthProgress()`
- service-year aggregation

No screen should aggregate `HourRecord` or `Session` directly.

### `ServiceYearMonth` ViewModel

A dedicated presentation model for one visible month in the service year:
```ts
type ServiceYearMonth = {
  id: string;              // deterministic UI identifier
  year: number;
  month: number;
  hours: number;
  source: "session" | "legacy";
};
```
It is **not** a `HourRecord`, **not** a `Session`, and is **never stored** —
a read-time projection produced by the aggregation layer only.

### Service-year aggregation

The aggregation layer exposes a service-year aggregation API built on top
of unified monthly aggregation. Its implementation must:
- enumerate the union of months represented by `HourRecord` and `Session`,
- resolve every month through the existing `monthTotal()` rule,
- preserve the existing service-year grouping semantics,
- never duplicate aggregation logic.

`monthTotal()` remains the single authoritative aggregation primitive.

### Home integration

Home no longer aggregates `HourRecord` directly — it consumes the
aggregation layer instead. Home's layout, styling, spacing, and visual
behavior remain unchanged; only the data source changes. This preserves
the TASK_004 Home freeze while making Home fully Session-aware.

### Month chips

Month chips display values from the `ServiceYearMonth` ViewModel. Visual
appearance stays identical — only the underlying data model changes.

### Editing behavior

- If a month is authoritative through **Session**: do not open the legacy
  `RecordForm`. Show a temporary informational message indicating the
  month is managed from the Hours section. Full navigation to Month
  Details arrives in TASK_005D.
- If a month is authoritative through **`HourRecord`**: continue using the
  existing `RecordForm` exactly as today, always bound to a real
  `HourRecord` — never pass the ViewModel itself into `RecordForm`.

### Non-goals

- Does not redesign Home; does not change its layout, styling, spacing,
  navigation, or visual appearance.
- Does not introduce synthetic `HourRecord` objects.
- Does not write any ViewModel into storage.
- Does not change existing service-year UX beyond the temporary editing
  guard above.
- The Hours screen preserves its current behavior during TASK_005A. The
  aggregation API it currently consumes (`groupBySY()`/`hoursForMonth()`)
  must not be renamed, modified, or have its contract changed in this
  task. Any capability Home needs is an additive extension to the
  aggregation layer, not an alteration of the Hours screen's existing
  dependency. Migrating the Hours screen to the new aggregation layer is
  deferred to TASK_005D.

### Completion Criteria — Home Integration Addendum
- The aggregation layer exposes unified service-year aggregation.
- Home no longer performs direct aggregation over `HourRecord`.
- Home service-year totals correctly include Session-authoritative months.
- Home month grid correctly represents both legacy and Session months via
  the `ServiceYearMonth` ViewModel.
- The Hours screen continues to compile and behave identically without
  modification, confirming its existing aggregation dependency and
  contract remain unchanged during TASK_005A.
- No visual regression exists on the Home screen.
- `RecordForm` never edits a Session-authoritative month.
- No synthetic `HourRecord` objects are created.
- No additional storage is introduced.
- No changes are made to Home's visual design.

---

## Architecture Review Checklist

This checklist is mandatory. It must be completed before deployment and
release. The review verifies **architectural compliance**, not
implementation correctness — that is covered separately by the
Completion Criteria above and by verification/testing.

### Architectural invariants
- Session-first architecture is preserved.
- No UI aggregates `HourRecord` directly.
- Aggregation Layer remains the single source of truth.
- No hidden coupling between UI and storage.
- Implementation conforms to `TASK_005_ARCHITECTURE.md`.

### Implementation invariants
- Hours screen remains unchanged.
- Existing Hours aggregation API/contract remains unchanged.
- `RecordForm` never opens for Session-authoritative months.
- No ViewModel is ever persisted to storage.
- No synthetic `HourRecord` objects are created.
- Home uses only the aggregation layer.
- Home service-year totals correctly include Session-authoritative months.
- Home month grid correctly represents both legacy and Session months.
- No visual regression exists on the Home screen.
