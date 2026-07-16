# TASK_005D — Implementation Plan

**Goal:** Complete the Hours 2.0 structural migration per the FROZEN architecture (TASK_005_ARCHITECTURE.md §2–§3, §5–§6, §13 Phase D).

**Scope:** Hours Dashboard, Month Details, nested Stack navigator, route migration, service.tsx retirement.

**Out of scope (TASK_005E):** Statistics screen, charts, pace/projection, full-year HeatMap, charting library selection.

---

## 1. File & Route Map

| New / Moved File | Purpose | Architecture Ref |
|---|---|---|
| `app/(tabs)/hours/_layout.tsx` | Stack navigator for Hours module | §3, §101–106 |
| `app/(tabs)/hours/index.tsx` | **Hours Dashboard** (tab target) | §2, §5, §68–72 |
| `app/(tabs)/hours/month/[key].tsx` | **Month Details** | §2, §5, §74–77 |
| `app/(tabs)/hours/history.tsx` | Moved from `app/history.tsx` (no behavior change) | §3, §27–33 |
| `app/(tabs)/hours/timer.tsx` | Moved from `app/timer.tsx` (no behavior change) | §3, §56–65 |
| `app/(tabs)/hours/entry.tsx` | Moved from `app/entry.tsx` (no behavior change) | §3, §27–33 |
| `app/service.tsx` | **Retire** → redirect to `/hours` | §3, §35–37, §123–126 |
| `app/(tabs)/hours.tsx` | **Delete** (replaced by `hours/index.tsx`) | §2, §68 |
| `src/components/HeatMap.tsx` | New shared primitive (granularity="month"\|"day") | §5, §197–198 |
| `src/components/MonthSummaryCard.tsx` | Supersedes MonthlyHoursCard (goal + pace) | §5, §68 |
| `src/components/QuickActionsRow.tsx` | 4 buttons: Timer / Add Time / History / Stats | §5, §68–72 |
| `src/components/SessionRow.tsx` | Shared Session row (History + Month Details) | §5, §172–178, §173–175 |
| `src/components/MonthHeader.tsx` | Month Details header (total, delta to goal) | §5, §170–171 |
| `src/components/dashboard/HeatMap.tsx` | Move `HeatMap` to dashboard library (already present in spirit) | §5, §197–198 |

---

## 2. Step-by-Step Implementation Order

### Phase 0: Preparation (no code changes)
- [ ] Verify all tests pass (`npm test`, `tsc --noEmit`)
- [ ] Confirm Architecture Review Checklist (ADR-007) will be run before deploy/tag

### Phase 1: New Shared Primitives
**1.1** `src/components/HeatMap.tsx`
- Presentational only: props `cells: {date: string, value: number}[], granularity: "month" | "day", cellSize?: number, gap?: number`
- Month mode: 12 cells (Sep–Aug of current service year), color intensity by value
- Day mode: calendar grid for given month (use existing `monthProgress` logic for daysLeft etc.)
- Uses `react-native-svg` (already in deps via GoalRing)

**1.2** `src/components/MonthSummaryCard.tsx`
- Props: `hoursDone, goal, pace, daysLeft, onPress?`
- Shows: large hours, goal, pace (min/day), days left, progress bar
- Reuses design language from `HoursHeroCard` but compact

**1.3** `src/components/QuickActionsRow.tsx`
- Four equal-width buttons: Timer → `/hours/timer`, Add Time → `/hours/entry`, History → `/hours/history`, Statistics → `/hours/stats` (placeholder alert for now)
- Visual style matches Home's action buttons

**1.4** `src/components/SessionRow.tsx`
- Reusable row for a `Session`: date, duration, note, tap → edit (`/hours/entry?id=`), long-press → delete confirmation
- Copied/adapted from `history.tsx` and `timer.tsx` save overlay logic

**1.5** `src/components/MonthHeader.tsx`
- Props: `year, month, totalHours, goal, source: "session" | "legacy"`
- Shows: month label, total hours, delta to goal (ahead/behind), source badge

### Phase 2: Hours Module Structure
**2.1** Create directory `app/(tabs)/hours/`

**2.2** `app/(tabs)/hours/_layout.tsx`
```tsx
import { Stack } from "expo-router";
export default function HoursLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="month/[key]" />
      <Stack.Screen name="history" />
      <Stack.Screen name="stats" />
      <Stack.Screen name="timer" />
      <Stack.Screen name="entry" />
    </Stack>
  );
}
```

**2.3** `app/(tabs)/hours/index.tsx` — **Hours Dashboard**
- Uses `useStore()` for `records, sessions`
- Computes via `monthProgress(records, new Date(), sessions)` → `hoursDone, hoursRemaining, daysLeft`
- Computes `pace` = `hoursDone / (daysInMonth - daysLeft)` (or from `sessionsForMonth`)
- Renders:
  - `<MonthSummaryCard ... />`
  - `<QuickActionsRow />`
  - `<HeatMap cells={monthCells} granularity="month" />` — current service year (Sep–Aug)
  - Service-year list via `serviceYearAggregation(records, sessions)` → `MonthChip` (tap → `/hours/month/${key}`)

**2.4** `app/(tabs)/hours/month/[key].tsx` — **Month Details**
- Params: `key` = "YYYY-MM"
- Uses `useLocalSearchParams<{ key?: string }>()`
- Resolves sessions + records for that month via `sessionsForMonth`, `monthTotal`
- Renders:
  - `<MonthHeader year month totalHours goal source />`
  - If sessions exist: `<HeatMap cells={dailyCells} granularity="day" />`
  - Else: legacy empty state + legacy total display (per §10 edit policy)
  - `<SessionList>` using `<SessionRow>` for each session
  - Quick action: "Add session to this month" → `/hours/entry?date=YYYY-MM-DD` (prefill date)

**2.5** Move `app/history.tsx` → `app/(tabs)/hours/history.tsx`
- Update imports (relative paths)
- No behavior change

**2.6** Move `app/timer.tsx` → `app/(tabs)/hours/timer.tsx`
- Update imports
- No behavior change

**2.7** Move `app/entry.tsx` → `app/(tabs)/hours/entry.tsx`
- Update imports
- No behavior change

### Phase 3: Retire Old Routes
**3.1** Delete `app/(tabs)/hours.tsx` (legacy single-screen Hours)

**3.2** Update `app/service.tsx`:
- Replace SECTIONS onPress handlers:
  - "Добавить время" → `router.push("/hours/entry")`
  - "Таймер" → `router.push("/hours/timer")`
  - "История" → `router.push("/hours/history")`
  - "Статистика" → `router.push("/hours/stats")` (alert placeholder)

**3.3** Update `app/(tabs)/index.tsx` (Home):
- `HoursHeroCard` button already goes to `/timer` → change to `/hours/timer`

**3.4** Update any other references to old flat routes (grep for `/timer`, `/entry`, `/history`, `/service`)

### Phase 4: Statistics Placeholder
**4.1** Create `app/(tabs)/hours/stats.tsx`
- Minimal screen: title "Статистика", centered text "Появится в TASK_005E"
- Back button in header (Stack provides it)
- Satisfies navigation structure; real implementation in TASK_005E

### Phase 5: Verification & Cleanup
**5.1** Run full test suite: `npm test` (must be 89+ passing)
**5.2** Type-check: `tsc --noEmit` (clean)
**5.3** Expo web export: `npx expo export --platform web` (success)
**5.4** Manual smoke test:
- Tab → Hours shows Dashboard
- Dashboard → Month chip → Month Details
- Dashboard → Quick Actions → Timer / Entry / History / Stats
- History → tap session → Entry edit
- Timer → Stop → Save → returns to Dashboard with updated total
- service.tsx → all four buttons navigate correctly
- Home → "Начать служение" → Timer
**5.5** Update `docs/STATUS.md` (mark TASK_005D complete, note Architecture Review pending)
**5.6** Run Architecture Review Checklist (ADR-007) — separate step before deploy/tag

---

## 3. Data & Aggregation Reuse (No New Logic)

| Needed by Dashboard / Month Details | Source Function (already exists) |
|---|---|
| `hoursDone, hoursRemaining, daysLeft` | `monthProgress(records, now, sessions)` |
| `pace` (min/day) | `sessionsForMonth` → sum / daysElapsed |
| Service-year groups | `serviceYearAggregation(records, sessions)` |
| Month total (authoritative) | `monthTotal(records, sessions, year, month)` |
| Daily totals for HeatMap | `sessionsForMonth` → reduce by day |
| Session list for month | `sessionsForMonth` sorted by date desc |
| Legacy total for empty month | `records.find(r => r.year===y && r.month===m)?.hours` |

**No new functions in `constants.ts` required.**

---

## 4. Component Contracts (for reviewer clarity)

### `HeatMap`
```tsx
interface HeatMapProps {
  cells: { date: string; value: number }[]; // date = "YYYY-MM-DD" or "YYYY-MM"
  granularity: "month" | "day";
  cellSize?: number;      // default: 28 (month), 24 (day)
  gap?: number;           // default: 4
  maxValue?: number;      // for color scaling; default: max(cells.value)
}
```

### `MonthSummaryCard`
```tsx
interface MonthSummaryCardProps {
  hoursDone: number;
  goal: number;           // MONTHLY_GOAL (50)
  pace: number;           // minutes per day (0 if no data)
  daysLeft: number;
  onPress?: () => void;   // optional: navigate to Month Details
}
```

### `MonthHeader`
```tsx
interface MonthHeaderProps {
  year: number;
  month: number;
  totalHours: number;
  goal: number;
  source: "session" | "legacy";
}
```

### `SessionRow`
```tsx
interface SessionRowProps {
  session: Session;
  onPress: () => void;        // → edit
  onLongPress: () => void;    // → delete
}
```

---

## 5. Risk & Mitigation

| Risk | Mitigation |
|---|---|
| Route migration breaks deep links | All routes are new; no existing deep links to preserve (PWA has no auth, no external links) |
| HeatMap performance on web | Cells ≤ 366; `react-native-svg` is fast; memoize cells |
| Month Details legacy edit policy | Architecture §10: only allow `RecordForm` for legacy-authoritative months; implement guard in Month Details |
| Stats screen placeholder confuses users | Label clearly "Появится в TASK_005E"; disable in tab bar (Stats only reachable via QuickActionsRow) |
| TypeScript path alias breaks on move | Use `@/` alias consistently; verify `tsc` after each move |

---

## 6. Acceptance Criteria (Definition of Done)

- [ ] `app/(tabs)/hours/_layout.tsx` exists and Stack navigation works (push/pop, back swipe)
- [ ] `app/(tabs)/hours/index.tsx` renders Dashboard with all 4 sections
- [ ] `app/(tabs)/hours/month/[key].tsx` renders Month Details for both session and legacy months
- [ ] `app/(tabs)/hours/history.tsx` (moved) works identically to old `app/history.tsx`
- [ ] `app/(tabs)/hours/timer.tsx` (moved) works identically to old `app/timer.tsx`
- [ ] `app/(tabs)/hours/entry.tsx` (moved) works identically to old `app/entry.tsx`
- [ ] `app/service.tsx` redirects all 4 sections to Hours module routes
- [ ] `app/(tabs)/hours.tsx` deleted
- [ ] `app/history.tsx`, `app/timer.tsx`, `app/entry.tsx` deleted
- [ ] `src/components/HeatMap.tsx`, `MonthSummaryCard.tsx`, `QuickActionsRow.tsx`, `SessionRow.tsx`, `MonthHeader.tsx` created
- [ ] All 89+ tests pass (`npm test`)
- [ ] `tsc --noEmit` clean
- [ ] `npx expo export --platform web` succeeds
- [ ] `docs/STATUS.md` updated
- [ ] Architecture Review Checklist (ADR-007) completed (separate step before deploy/tag)

---

## 7. Estimated Effort

| Phase | Files | Est. Time |
|---|---|---|
| 1. Primitives | 5 new components | ~2h |
| 2. Hours module structure | 4 new screens + layout | ~3h |
| 3. Route migration | 3 moves + service.tsx update | ~1h |
| 4. Stats placeholder | 1 screen | ~0.5h |
| 5. Verification | Test run, typecheck, export | ~1h |
| **Total** | **~20 files touched** | **~7.5h** |

---

## 8. Notes for Implementer

- **Reuse aggressively**: `MonthChip`, `SessionForm`, `RecordForm`, `Modal`, `Card`, `SectionTitle` already exist.
- **No StoreContext changes**: All data access via existing `useStore()`.
- **No aggregation changes**: All math lives in `constants.ts` (frozen since TASK_005A).
- **Design tokens**: Dashboard uses global `COLORS`; Home-only tokens stay in `dashboard/tokens.ts` — do not mix.
- **Session-authoritative month edit guard**: In Month Details, if `source === "session"`, show informational alert (same as Home) — do NOT open `RecordForm`. "Add session" button always works.
- **Legacy month edit**: In Month Details, if `source === "legacy"`, tap on legacy row → open `RecordForm` in `Modal` (same as Hours screen today). This is the only place legacy editing survives after TASK_005D (Home and Hours Dashboard are read-only for legacy months).

---

**Ready for implementation upon approval.**