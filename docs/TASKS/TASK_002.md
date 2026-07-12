# TASK_002 — Ministry Time Tracking Module

**Status:** READY TO START  
**Priority:** P0

## Goal
Add a time tracking module inside the Hours tab without breaking the existing architecture.

## Phase 1 — "Hours This Month" card on the Hours screen
- Compact card at the top of the Hours screen
- Shows: hours this month, goal (50h), progress bar, remaining hours
- Tapping it opens a dedicated ServiceScreen

## Phase 2 — ServiceScreen with four sections
- Add Time (manual entry of hours and minutes)
- Timer (start/pause/stop)
- History (list of entries for the current month)
- Statistics (progress for the month and service year)

## Phase 3 — Future expansion
- Bible Studies
- Return Visits
- Notes
- Territories

## Rules
- New data stored in AsyncStorage under key mj_service_v1
- Existing hours logic (seed data, groupBySY) must not be touched
- Implementation is incremental — Phase 1 only for now

## Phase 1 Completion Criteria
Card is visible on the Hours screen, shows correct data for the current month, tapping opens ServiceScreen.
