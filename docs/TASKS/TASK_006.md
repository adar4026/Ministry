# TASK_006 — Home UI Polish: Title Hierarchy & Section Titles

**Status:** READY TO START
**Priority:** P3

## Background

Follow-up to TASK_004 Home Dashboard. Implemented after the completion of
TASK_005A and before TASK_005B. Not part of the TASK_005 Hours 2.0 phase
sequence.

## Goal

Rebalance the Home screen's visual hierarchy: a less dominant page title,
and section titles that sit above their cards instead of duplicated inside
them — matching a standard iOS grouped-list pattern, with no change to
data, logic, or navigation.

## Scope

- Reduce the font size of the page title ("Журнал служения"); same
  typography/weight, just smaller.
- Move each section title (Сегодня, Ближайшие события, Текущий служебный
  год, Последние события) from inside its card to a plain heading above
  the card.
- Remove the now-duplicated title text from inside `TodayCard` and
  `UpcomingEventsCard` (both Home-only components) and from the two
  inline card sections in `app/(tabs)/index.tsx`.
- Rebalance spacing so title-to-card feels tighter than section-to-section.

## Non-Goals

- No architecture changes, no data model changes, no business logic
  changes, no navigation changes.
- No redesign of the cards themselves (radius, shadow, padding, content
  layout stay as-is).
- No changes to Hours, Events, Add, or Profile screens.
- No deployment, no Git tag — this is a UI-only change and does not
  require an Architecture Review Checklist pass (see Rules below).

## Rules

- Follows the project rule "No task in docs/TASKS → no code."
- No Architecture Review Checklist required for this task, because it
  introduces no architecture changes, no data model changes, no business
  logic changes, no navigation changes, no deployment, and no Git tag.

## Definition of Done

- Page title is visibly smaller, same weight/typography.
- Section titles render above their cards, not inside them; no card
  contains a duplicated section title.
- `Home` still computes its current-service-year data via
  `serviceYearAggregation()` — untouched.
- Tapping a Session-authoritative month still shows the informational
  alert; tapping a legacy month still opens `RecordForm` bound to the
  real `HourRecord` — both untouched.
- Hours, Events, Add, and Profile screens are visually unchanged.
- All Home data (Today card, upcoming events, current service year grid,
  recent events) still renders correctly.
