# TASK_004 — Home Dashboard 2.0

**Status:** READY TO START
**Priority:** P0

## Goal

Transform the Home screen into a daily dashboard that immediately answers three questions:

- How is my ministry progressing?
- What important events are coming?
- What are my key statistics today?

The Home screen should become the primary entry point of the application.

---

## Phase 1 — Home Layout

The Home screen must remain fully scrollable.

The top dashboard card must scroll naturally with the page.

It must NOT stay fixed while scrolling.

This dashboard card must exist ONLY on the Home screen.

Remove it from:

- Hours
- Events
- Add
- Profile

---

## Phase 2 — Today Card

Create a new compact card titled:

Today

Display:

- Current date
- Days remaining until the end of the current month
- Hours completed this month
- Remaining hours to the monthly goal
- Required average hours per day to reach the goal
- Progress status:

  - Ahead of schedule
  - On schedule
  - Behind schedule

Use the existing StoreContext as the data source.

Do not create duplicate calculations.

---

## Phase 3 — Upcoming Events

Below the Statistics section add a new card:

Upcoming Events

Display only future events.

Each item should show:

- Date
- Title
- Remaining days

Example:

18 July

Public Talk

in 6 days

--------------------

2 August

Convention

in 21 days

Add:

Show all →

Tapping this opens the Events screen.

Future events must be calculated automatically from the existing Events and Talks collections.

Do not duplicate data.

---

## Phase 4 — Home Cleanup

Remove every remaining piece of personal profile information from the Home screen.

Personal information belongs only to the Profile screen.

The Home screen should contain only:

- Today's ministry summary
- Statistics
- Upcoming events

---

## Rules

- Do not modify StoreContext.
- Do not modify Hours functionality.
- Do not modify seed data.
- Do not duplicate Events or Talks data.
- Keep all calculations derived from the existing data.
- Preserve existing functionality.
- Match the current design language (colors, typography, spacing, cards).

---

## Completion Criteria

- Dashboard card scrolls with the page.
- Dashboard card exists only on the Home screen.
- Today card displays correct calculations.
- Upcoming Events displays the nearest future events.
- "Show all" opens the Events screen.
- No personal profile information remains on the Home screen.
- Existing functionality continues to work without regressions.
