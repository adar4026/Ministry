# TASK_005 — Hours 2.0 — Architecture

**Status:** FROZEN — approved 2026-07-13.

This document is the required design step before implementation, per
`docs/DECISIONS.md` ADR-004 ("no TASK, no code"). It reflects the final
architectural decisions for TASK_005. Implementation must follow it exactly;
any further architectural change requires an explicit review and update of
this document first, not an ad hoc change during development.

---

## 1. Product vision

Hours today shows *what happened* (a list of monthly totals). Hours 2.0
makes it the tool the publisher opens *during* the month — to start a timer,
log a session right after coming back from the ministry, see whether
they're ahead or behind pace, and understand their year at a glance. It
becomes the primary daily workspace, matching the ambition already set for
Home in TASK_004.

**Session is the primary domain entity going forward.** All new business
logic is built around `Session` records. Monthly totals, service-year
totals, statistics, heat maps, pace, and projections are all **aggregated
views derived from `Session`** whenever session data exists for a given
month. The existing `HourRecord` (260 immutable monthly totals from
`seed.js`, Sept 2003 – present) is permanent legacy data with no day-level
breakdown — it remains the fallback data source only for historical months
that have no `Session` data, and is never migrated, rewritten, converted, or
synchronized (see §7–§9).

This also directly resolves the stub already sitting in the codebase:
`app/service.tsx` (from TASK_002) lists four unimplemented sections —
"Добавить время", "Таймер", "История", "Статистика" — that are exactly
Manual Entry, Timer, Session History, and Statistics below. Hours 2.0
finishes what that stub started, properly homed inside the Hours module
instead of a floating top-level route.

**Out of scope / explicitly protected:**
- `src/data/seed.js` is never modified (project rule).
- Home (TASK_004) is frozen — its UI, layout, styling, and navigation are
  not modified. Its service-year data source gets one narrowly scoped
  exception, completed by the TASK_005A addendum (§11): `index.tsx`
  consumes the new aggregation layer instead of aggregating `HourRecord`
  directly, so the unchanged UI renders correct Session-aware data.
- `StoreContext` remains the single data-access point (ADR-003), so the
  future A-Lex Core migration is unaffected by this redesign.

---

## 2. Screen map

The current single `app/(tabs)/hours.tsx` becomes a nested stack, and
`app/service.tsx` is retired (its sections move here). **Timer and Manual
Entry are dedicated screens, not modals** — see §3.

```
app/(tabs)/hours/
├── _layout.tsx         Stack navigator for the Hours module
├── index.tsx            Hours Dashboard        (main screen, tab target)
├── month/[key].tsx        Month Details          (key = "YYYY-MM")
├── history.tsx              Session History
├── stats.tsx                  Statistics (monthly + SY + charts + pace + projection)
├── timer.tsx                    Ministry Timer          (dedicated screen)
└── entry.tsx                      Manual Time Entry        (dedicated screen; ?id= to edit)
```

**Hours Dashboard** (`hours/index.tsx`) — replaces today's `hours.tsx`:
Month Summary Card (current month hero: hours done, goal, pace, days left),
Quick Actions (Start Timer / Add Time / History / Statistics), a compact
month-granularity Heat Map for the current service year, and the existing
service-year list (kept, refined) — tapping a month opens Month Details.

**Month Details** (`hours/month/[key].tsx`) — one month: total, delta to
goal, a *daily* heat map if sessions exist for that month, otherwise an
explanatory empty state with a legacy-total display (see §10 for the edit
policy); the session list for that month; "add session to this month".

**Session History** (`hours/history.tsx`) — reverse-chronological, grouped
by service year → month: individual sessions plus one collapsed row per
legacy (session-less) month. Tap to edit, swipe/long-press to delete —
same interaction pattern as today's month chips.

**Statistics** (`hours/stats.tsx`) — Monthly statistics, Service year
statistics, a 12-month trend chart, a full-year heat map, Performance pace,
End-of-month projection. One analytics home instead of scattering these.
Chart components are abstract — see §5.

**Ministry Timer** (`hours/timer.tsx`, dedicated screen — see §3) —
Start/Pause/Resume/Stop. Running state is persisted so it survives the app
being killed. Stop opens a save step (date, duration derived from elapsed
time, optional note) on the same screen.

**Manual Time Entry** (`hours/entry.tsx`, dedicated screen — see §3) —
create/edit a *Session* (date, duration, optional note). This is new and
distinct from the existing `RecordForm`, which is kept only for the
retrospective legacy-backfill flow described in §10.

---

## 3. Navigation architecture

- The Hours tab keeps its place in the tab bar; `hours/index.tsx` is the
  landing screen.
- Internal navigation is a native **Stack** nested under the tab
  (`app/(tabs)/hours/_layout.tsx`), giving push/pop + back-swipe.
- **Timer is a dedicated, distraction-free screen — not a modal.** It is
  one of the core workflows of the app: the user is meant to stay on it for
  the duration of a ministry outing, uninterrupted. It is a single stable
  route (`hours/timer`) so that future functionality (GPS, companions,
  notes, territory, etc.) can extend the screen's content without requiring
  any navigation changes — no new routes, no new stack entries, just more
  sections on the same screen.
- **Manual Time Entry is a dedicated screen — not a modal**, for consistent
  navigation, easier validation, easier editing, and the same future
  extensibility rationale as Timer.
- The existing small `<Modal>` component is *not* used by either of these
  flows. It remains in use only for its current, narrower role: editing a
  legacy `HourRecord` monthly total (see §10) — unchanged from today.
- Routes are deep-link-shaped by construction (`hours/month/2026-06`), so a
  future "jump to this month" link from Statistics or elsewhere needs no new
  plumbing.
- The current Hours screen's dead `router.push("/service")` reference
  (in `MonthlyHoursCard`'s `onPress`) is retargeted to `router.push("/hours")`
  once the new module lands; that screen is itself replaced by
  `hours/index.tsx` in TASK_005D.

---

## 4. User flows

**A — Log time right after an outing (timer).** Dashboard → Start Timer →
Timer screen runs → app can be closed/reopened, timer state recovers from
persisted `startTime` → Stop → confirm/edit duration + note, on the same
screen → Save → Session created → returning to Dashboard shows the updated
total immediately.

**B — Manual entry for a past date.** Dashboard / Month Details / History →
Add Time → Manual Entry screen → pick date → enter duration in
minutes/hours → optional note → Save → Session created, month total
recomputes.

**C — Reviewing a past month.** Dashboard → service-year list → tap a month
→ Month Details → daily heat map (session-era) or legacy total (pre-cutover)
→ tap a session → edit or delete.

**D — Backfilling a historical month (legacy workflow).** Only reachable for
months with no `Session` data yet (see §10) — Month Details (legacy month)
→ "Edit monthly total" → existing `RecordForm`-in-`Modal` pattern → Save
updates the `HourRecord`.

**E — Checking progress.** Dashboard → Statistics → monthly/SY stats, trend
chart, pace, projection, full heat map, one scroll.

**F — Deleting a session.** History or Month Details → swipe/long-press →
confirm (same `Alert.alert` pattern as today) → removed, totals recompute.

---

## 5. Component hierarchy

```
hours/index.tsx
├── MonthSummaryCard        (supersedes MonthlyHoursCard; goal + pace)
├── QuickActionsRow         (Start Timer / Add Time / History / Stats)
├── HeatMap (granularity="month")
└── ServiceYearList → MonthChip (existing, reused)

hours/month/[key].tsx
├── MonthHeader
├── HeatMap (granularity="day")   — or legacy empty-state
├── SessionList → SessionRow
└── QuickActionsRow (contextual)

hours/history.tsx
├── GroupedList (service year → month)
│   ├── SessionRow (shared with Month Details)
│   └── LegacyMonthRow

hours/stats.tsx
├── MonthlyStatsCard
├── ServiceYearStatsCard
├── TrendChart              (abstract — see §5a)
├── PaceCard
├── ProjectionCard
└── HeatMap (granularity="month", full year)

hours/timer.tsx                 (dedicated screen, not a modal)
├── TimerDisplay
├── TimerControls (Start/Pause/Resume/Stop)
└── SessionSaveStep (shown on Stop, same screen; shares fields with SessionForm)

hours/entry.tsx                 (dedicated screen, not a modal)
└── SessionForm (new; parallel to existing RecordForm, not a replacement)
```

New shared primitives in `src/components/`: `HeatMap` (one component, two
density modes, purely presentational — takes precomputed `{date, value}[]`
cells), `SessionRow`, `SessionForm`. Business/derivation logic stays as pure
functions in `src/data/constants.ts` (or a new `src/data/sessions.ts`),
matching the existing style of `hoursForMonth`/`monthProgress`/`groupBySY` —
no new state-management library, no logic inside components.

### 5a. Charts stay library-agnostic

No charting library is selected as part of this architecture. `TrendChart`
and `HeatMap` are **abstract presentational contracts**: they accept plain
precomputed data (`{date, value}[]` or equivalent) and render it — the
choice of rendering technology (`react-native-svg`, `react-native-skia`,
Victory, or hand-rolled) is an implementation detail deferred entirely to
**TASK_005E**. Nothing upstream of TASK_005E depends on a specific charting
library.

---

## 6. Data model

### New entity — `Session`

Kept intentionally minimal for TASK_005. No `type`, no credit-hour or other
ministry-specific classification — those can be added later as a new
optional field without changing this architecture.

```ts
type Session = {
  id: string;
  date: string;              // ISO day "YYYY-MM-DD" — the day the time was spent
  startTime?: string;         // ISO datetime; required when source === "timer"
  endTime?: string;            // ISO datetime; required when source === "timer"
  durationMinutes: number;      // authoritative duration; always required
  note?: string;
  source: "manual" | "timer";
  createdAt: string;              // ISO datetime
  updatedAt: string;               // ISO datetime
};
```

**Creation-flow nullability rules:**

- **Timer sessions** (`source: "timer"`) — `startTime` and `endTime` are
  required. `durationMinutes` is derived from `endTime - startTime` at save
  time and stored as the authoritative value.
- **Manual sessions** (`source: "manual"`) — `durationMinutes` is required
  and authoritative. `startTime`/`endTime` are optional and purely
  informational when present. Manual entry must never require the user to
  invent or remember exact start/end times.
- Aggregation always sums `durationMinutes` regardless of `source`, so both
  flows produce directly comparable records.

### Existing entity — `HourRecord` (unchanged)
Same shape as today. Permanent legacy data (see §9): authoritative exactly
when a month has zero `Session`s (see §7–§8).

### New — `TimerState` (crash-recovery, not a reporting entity)
```ts
type TimerState = {
  startedAt: string | null;   // ISO datetime; null = not running
  accumulatedMinutes: number;  // banked time across pause/resume segments
  paused: boolean;
};
```
Storage key: `mj_timer_v1`. Kept separate from `Session` so an abandoned or
killed timer never silently becomes a phantom entry — it only becomes a
`Session` when the user explicitly confirms Stop → Save on the Timer screen.

### Derived (computed, never stored)
- `monthTotal(year, month)` — see the exact rule in §7.
- `dailyTotals(year, month)` — day → minutes map, sessions only (empty for
  legacy months — the signal Month Details uses to show the fallback state).
- `serviceYearTotal(sy)` — sum of `monthTotal()` across the SY's months.
- `pace(windowDays)` — average minutes/day over the trailing N days of
  sessions.
- `projection(year, month)` — `hoursDone + pace × daysLeft`.

---

## 7. Aggregation rule (final)

Monthly aggregation is a **pure read-time computation**. No stored,
materialized, or cached total — every screen recomputes it from `records` +
`sessions` on read, exactly like `hoursForMonth`/`monthProgress` do today.

```
monthTotal(year, month) =
    Session.sum(year, month)              if at least one Session exists for that month
    otherwise
    HourRecord(year, month)?.hours ?? 0
```

- No automatic migration is performed.
- No synthetic `Session` records are ever created from `HourRecord`.
- No synchronization between `HourRecord` and `Session` is performed.
- No merging of the two data sources for the same month is performed.
- `HourRecord` remains immutable except through the explicit legacy-backfill
  edit flow described in §10, which only applies to months with zero
  Sessions.
- `Session` records are created, edited, and deleted only through explicit
  user actions (Manual Entry screen, Timer screen, delete from
  History/Month Details) — never generated implicitly.

---

## 8. Single authoritative source per month

A given month has **exactly one** authoritative data source at read time:

- If at least one `Session` exists for the month → Session aggregation is
  authoritative.
- Otherwise → `HourRecord` is authoritative.

The application never combines both sources for the same month. There is no
reconciliation UI, because there is nothing to reconcile — the two sources
are never blended.

---

## 9. Legacy `HourRecord` policy

`HourRecord` is permanent legacy data. It is never:
- migrated,
- rewritten,
- converted into `Session` records,
- synchronized with `Session`.

The original seed data (`src/data/seed.js`) remains unchanged forever, per
the project's data-protection rule (`CLAUDE.md`).

---

## 10. Product rule: Session becomes the primary recording path

Beginning with **TASK_005B**, the legacy monthly `HourRecord` entry workflow
is **no longer the primary way to record ministry time**.

- For current and future months, all new ministry time must be recorded
  through **Manual Entry** or **Timer** (i.e. as `Session` records).
- The legacy monthly `HourRecord` entry workflow (the existing
  `RecordForm`/`Modal` pattern) remains available **only** for retrospective
  backfilling of historical months that do not yet contain `Session` data.

This keeps `HourRecord` and `Session` from ever competing for the same
month during normal use — consistent with §8.

**Resolved (TASK_005B): legacy entry is blocked, not warned.** The legacy
`HourRecord` entry workflow (reached from `app/(tabs)/add.tsx` and from
the Hours screen's month-chip edit) refuses to save for: the current
calendar month, any future month, and any past month that already has
≥1 `Session`. Past months with zero `Session`s remain fully editable —
this preserves the legitimate historical-backfill use case. A
warn-but-allow treatment was considered and rejected: it would leave the
dual-source collision physically possible, undermining the
single-authoritative-source guarantee in §8. The check is implemented as
a single shared predicate, not duplicated per screen — see
`TASK_005B.md` for the implementation details.

---

## 11. Home integration

`StoreContext` remains the single data-access point. Home's UI, layout,
styling, and navigation are **not modified**. Home continues to call:
- `hoursForMonth()`
- `monthProgress()`

Only the aggregation layer behind these functions changes internally (per
§7) — same signatures, same return shapes, session-aware results.

**Resolved by the TASK_005A addendum (the one narrowly scoped exception to
the Home freeze):** Home's `index.tsx` also calls
`groupBySY(records)` directly (not just through the two functions above) to
build the "Текущий служебный год" month grid, which iterates `HourRecord[]`
only — a future month tracked exclusively via `Session` would otherwise not
produce a grid entry there. This gap is closed by the "Home Service-Year
ViewModel" addendum in `docs/TASKS/TASK_005A.md`: a dedicated aggregation
layer exposes unified service-year aggregation and a `ServiceYearMonth`
read-time ViewModel, and Home consumes that instead of aggregating
`HourRecord` directly. This is a narrowly scoped exception to the Home data
source only — Home's UI, layout, styling, and navigation are unchanged. The
Hours screen itself keeps its existing `groupBySY()`/`hoursForMonth()`
contract untouched until TASK_005D.

---

## 12. Storage

New storage namespace, following the existing project naming convention:

```
mj_sessions_v1   — array of Session
```

This is documented as the fourth key alongside `mj_records_v1`,
`mj_events_v1`, `mj_talks_v1`. Updating `docs/ARCHITECTURE.md`'s "Ключи
хранилища" table with this key is part of **TASK_005A's Definition of
Done**. `mj_timer_v1` (TimerState, §6) is a separate, non-reporting key
introduced in TASK_005C.

---

## 13. Phase order (fixed)

**TASK_005A — Session data layer**
Session entity, `mj_sessions_v1` storage, aggregation logic, and
schema-versioning support for the Session store only (i.e. the store is
structured so a future `mj_sessions_v1` → `mj_sessions_v2` migration is
possible later, per the ADR-002 pattern — no such migration is implemented
now). Does **not** include any migration, conversion, synchronization, or
copying of `HourRecord` data into `Session`. No UI, with the single
exception of the Home Service-Year ViewModel addendum (§11) — Home's data
source becomes Session-aware, its UI does not change.

**TASK_005B — Manual Entry screen and History screen**

**TASK_005C — Timer screen and timer workflow**

**TASK_005D — Hours Dashboard and Month Details**

**TASK_005E — Statistics, Charts, Heat Map, Pace and Projection**

Ordering rationale: A is the foundation everything reads from; B ships
before C since Timer's Stop step reuses B's session-save logic; D needs real
sessions to point its quick actions and heat map at; E reads across
everything, so it goes last. Each phase is buildable and committable on its
own, per the repo's one-stage-one-commit rule.

---

## Resolved decisions (for reference)

The following were open questions in the draft version of this document and
are now resolved:

1. **Timer/Entry are dedicated screens, not modals** (§3). Driven by Timer
   being a core, extensible workflow and Entry needing consistent
   navigation/validation/scalability.
2. **No `Session.type` / credit-hour classification in TASK_005** (§6).
   Deferred to a later, explicitly-reviewed addition.
3. **No charting library selected now** (§5a). Fully deferred to TASK_005E.

4. **Home's `groupBySY` gap resolved** (§11) — via the "Home Service-Year
   ViewModel" addendum in `docs/TASKS/TASK_005A.md`, not left as an open
   follow-up.

5. **Legacy entry on a Session-covered month is blocked, not warned**
   (§10) — resolved during TASK_005B scoping; see `TASK_005B.md`.
