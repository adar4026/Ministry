# TASK_003 — Navigation and Profile

**Status:** READY TO START
**Priority:** P0

## Goal

Improve the application navigation and move all user-related information into a dedicated Profile section.

## Phase 1 — Navigation

Replace the current bottom navigation:

- Home
- Hours
- Events
- Add
- Talks

with:

- Home
- Hours
- Events
- Add
- Profile

The "Talks" tab must be removed.

## Phase 2 — Events

Move all Public Talks into the Events module.

Add a new event category:

- Public Talk

Add a corresponding filter:

- Public Talks

Talks should now be displayed inside Events instead of having a dedicated tab.

Do not lose any existing talk data.

## Phase 3 — Profile

Create a new Profile screen.

Move the current personal information from the Home screen into the Profile.

The profile header should display:

- User photo (placeholder for now)
- Name
- Baptism date
- Pioneer since
- Years in pioneer service
- G-8 expiration

Below the profile card add sections:

### Settings

- Notifications
- Goals
- Service Calendar
- Statistics
- Appearance
- Language

### Data

- Export
- Import
- Backup
- Restore

Display:

Synchronization (Coming later via A-Lex Core)

### About

- App Version
- Changelog
- Feedback

The profile should also be accessible by tapping the avatar in the top-right corner of the Home screen.

## Rules

- Do not modify StoreContext.
- Do not modify seed data.
- Do not modify Hours functionality.
- Preserve all current behavior.
- Match the existing UI style.

## Completion Criteria

- Bottom navigation shows Profile instead of Talks.
- Talks are available inside Events.
- Profile screen is fully functional.
- Personal information has been removed from the Home screen.
- Avatar on the Home screen opens Profile.
