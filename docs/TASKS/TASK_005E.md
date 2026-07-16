# TASK_005E — Hours 2.0: Statistics, Charts, Heat Map, Pace, and Projection

**Status:** COMPLETED
**Priority:** P0
**Date:** July 2026
**Version:** 0.4.3
**Commit:** fc23c52
**Tag:** v0.4.3

---

## Architecture Status

TASK_005 Architecture: **FROZEN** (approved 2026-07-13)
Implementation conforms to `docs/TASKS/TASK_005_ARCHITECTURE.md` §5, §84–86, §5a.

---

## Goal

Introduce the Statistics experience for Hours 2.0 — a single analytics home for:
- Monthly statistics
- Service-year statistics
- 12-month trend chart
- Full-year heat map
- Performance pace (rolling 7/30/90-day)
- End-of-month projection

All built on the **existing aggregation layer** — **no new business logic**, **no StoreContext changes**, **no schema changes**.

---

## Scope

### Components Created

| File | Purpose |
|------|---------|
| `src/components/stats/MonthlyStatsCard.tsx` | Current month: hours done, goal %, days left, pace (7d), chips for remaining/days/pace |
| `src/components/stats/ServiceYearStatsCard.tsx` | Current SY: months completed/12, avg/month, projection to Aug, session vs legacy month breakdown |
| `src/components/stats/TrendChart.tsx` | 12-month trend line (Sep–Aug), area fill, tappable points → Month Details |
| `src/components/stats/PaceCard.tsx` | Rolling 7d / 30d / 90d pace (min/day), trend arrow (7d vs 30d) |
| `src/components/stats/ProjectionCard.tsx` | Month-end projection (7d & 30d pace), goal meet/miss, days to goal, projected goal date |
| `src/components/HeatMap.tsx` (reuse) | Full-year service year heatmap (month granularity), tap → Month Details |

### Data Layer

| File | Purpose |
|------|---------|
| `src/data/stats.ts` | Pure helpers: `trailingPace`, `projectMonthEnd`, `projectServiceYearEnd`, `monthCellsForSY` |
| `src/data/__tests__/stats.test.ts` | 16 unit tests for stats helpers |
| `src/data/constants.ts` | Re-exports stats helpers for backward compatibility |

### Screen

| File | Purpose |
|------|---------|
| `app/(tabs)/hours/stats.tsx` | Real Statistics screen implementation (replaces TASK_005D placeholder) |

---

## Navigation Flow

```
Hours Dashboard (index.tsx)
    ↓ QuickActionsRow → "Статистика"
    ↓ /hours/stats (Stack push)
Stats Screen (stats.tsx)
    ↓ MonthlyStatsCard tap → /hours/month/[current-month]
    ↓ TrendChart point tap → /hours/month/[YYYY-MM]
    ↓ HeatMap cell tap → /hours/month/[YYYY-MM]
    ↓ Back button → Hours Dashboard
```

---

## Data Flow

```
StoreContext (records[], sessions[])
    ↓
Aggregation Layer (constants.ts — FROZEN)
    • monthTotal()              — authoritative monthly hours
    • sessionsForMonth()        — filter sessions by month
    • serviceYearAggregation()  — unified SY view with sources
    • monthProgress()           — days left, hours done, required pace
    • trailingPace()            — 7/30/90-day avg min/day (new)
    • projectMonthEnd()         — hoursDone + pace × daysLeft (new)
    • projectServiceYearEnd()   — SY projection (new)
    • monthCellsForSY()         — 12 cells for HeatMap (new)
    ↓
Stat Components (read-only, presentational)
    ↓
Stats Screen (ScrollView with all cards)
```

**No StoreContext changes.** All reads via existing `useStore()` → `records`, `sessions`.

---

## Non-Goals

- No charting library selection (TrendChart uses `react-native-svg` already in deps)
- No confidence intervals in Projection (simple pace-based projection only)
- No dual-axis charts
- No synthetic HourRecord creation
- No StoreContext or aggregation layer modifications
- No migration of HourRecord → Session

---

## Rules Followed

- **Frozen architecture respected** — TASK_005_ARCHITECTURE.md §5, §84–86
- **Session-first aggregation** — all cards use `monthTotal()`/`serviceYearAggregation()` (Session-authoritative when sessions exist)
- **Single authoritative source per month** — upheld via aggregation layer
- **Legacy HourRecord untouched** — `seed.js` never modified
- **One logical stage, one commit** — `fc23c52`
- **Buildable after commit** — verified

---

## Verification

| Check | Result |
|-------|--------|
| `npm test` | 105/105 passing (16 new stats tests) |
| `npx tsc --noEmit` | Clean |
| `npx expo export --platform web` | Success (23 routes) |
| Architecture Review (ADR-007) | Passed |

**TASK_008 historical note (retrospective, not a rewrite of the table above):** no standalone
checklist-result evidence for this task's "Architecture Review (ADR-007) | Passed" claim could
be located during the TASK_008 retrospective review (see
`docs/TASKS/TASK_008_HOURS_INTEGRITY_AND_RELEASE_RECONCILIATION.md` §12). That review found
this task's `src/data/stats.ts` carried both residual UTF-8 mojibake and a duplicate
aggregation primitive (`monthTotalFromSources()`) that violated the frozen architecture's
single-canonical-primitive rule — defects a passed checklist should have caught. TASK_008
remediated both, on unreleased `main`, after `v0.4.4` had already shipped with this task's
original code. The table above is left as originally written; this note does not alter it.

---

## Release

- **Commit:** `fc23c52` — `feat(hours): TASK_005E — Statistics experience for Hours 2.0`
- **Branch:** `main` (pushed to `origin/main`)
- **Tag:** `v0.4.3` (pushed to `origin`)
- **Deploy:** `npm run deploy` — GitHub Pages published successfully

---

## Files Touched (9)

```
src/data/stats.ts                          (new)
src/data/__tests__/stats.test.ts           (new)
src/components/stats/MonthlyStatsCard.tsx  (new)
src/components/stats/ServiceYearStatsCard.tsx (new)
src/components/stats/TrendChart.tsx        (new)
src/components/stats/PaceCard.tsx          (new)
src/components/stats/ProjectionCard.tsx    (new)
src/data/constants.ts                      (modified — re-exports)
app/(tabs)/hours/stats.tsx                 (modified — full implementation)
```

---

## Next Steps

- STATUS.md update (separate documentation commit)
- Future TASK: Advanced forecasting, confidence intervals, charting library evaluation if needed