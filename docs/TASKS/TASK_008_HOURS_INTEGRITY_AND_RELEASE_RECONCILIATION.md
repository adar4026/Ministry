# TASK_008 — Hours 2.0 Integrity Fixes and Release Reconciliation

**Status:** APPROVED — implementation not started; this document precedes any code change (ADR-004).
**Priority:** P0
**Type:** Corrective task (defect remediation + documentation reconciliation), not new feature work.

## Architecture Status

TASK_005 Architecture: **FROZEN** (`docs/TASKS/TASK_005_ARCHITECTURE.md`). TASK_008 does not
modify the approved architecture or any of its invariants — it restores conformance to
invariants that later implementation (TASK_005D, TASK_005E) drifted away from. Where this
document reorganizes code across files (§4.1), it explicitly preserves every exported name,
signature, and call-site contract; see §4.1 for the exact constraint set.

If, during implementation, a genuine architectural constraint is discovered that TASK_008
cannot satisfy without changing a frozen contract, storage format, or `seed.js`: implementation
stops, the constraint is documented, and explicit approval is requested before continuing
(ADR-007 process) — no ad hoc architectural change during coding.

---

## 1. Context

Following the July 2026 UTF-8/mojibake incident (see `docs/AI_INFRASTRUCTURE.md` §8–§9,
ADR-008, commit `b9fe019`) and the release of `v0.4.4`, a repository audit was performed to
verify the state of the Hours 2.0 feature set (TASK_005A–TASK_005E) and the accuracy of
release-adjacent documentation. The audit found that:

- `main` is at `de32d87`, one commit ahead of the `v0.4.4` tag (`88769b7`) — `de32d87` is
  unreleased.
- Several Hours 2.0 correctness defects survived TASK_005D/TASK_005E and the (incompletely
  documented) ADR-007 review process for those tasks.
- Release and task documentation (`docs/STATUS.md`, `TASK_005E.md`) contain claims that are
  either stale or not supported by verifiable evidence.

TASK_008 is the corrective task addressing these findings. It was preceded by a preliminary
inspection stage (this session) that independently verified every audit finding directly
against source and git history before any code was written.

---

## 2. Audit Findings — Confirmed Defects

All findings below were independently verified against the repository at `de32d87` (branch
`main`, matching `origin/main`) before this document was written.

### 2.1 Session-first authority violated in the Hours Dashboard

`app/(tabs)/hours/index.tsx` computes its heat-map cells by directly filtering and reducing
`records`/`sessions` in the component (`monthCells` `useMemo`), instead of calling the existing
aggregation-layer function. This violates the architecture's "no UI aggregates domain
collections directly" rule (`TASK_005_ARCHITECTURE.md` §7–§8; restated in `TASK_005A.md`'s
Architecture Review Checklist: "No UI aggregates HourRecord directly").

### 2.2 Authority decided by sum-positivity, not by existence

Within that same duplicated logic, `app/(tabs)/hours/index.tsx:42`:

```ts
const hours = sessionTotal > 0 ? sessionTotal : total;
```

decides whether Sessions are authoritative for a month by testing whether their *summed
duration* is greater than zero, not by testing whether any Session *exists* for that month.
This is the wrong invariant per architecture: a month is Session-authoritative because Sessions
exist for it, independent of their total. Under current product flows this is latent —
`SessionForm.tsx` rejects `minutes <= 0` at submission, and the Timer's `ceil(bankedSeconds/60)`
conversion with Save disabled at `bankedSeconds == 0` also guarantees a positive duration — but
`StoreContext.saveSession()` performs no runtime validation of `durationMinutes`, so the
aggregation layer must not depend on a guarantee the storage layer doesn't enforce.

### 2.3 Legacy and Session data must never be mixed for one month

Consequence of §2.1–§2.2: correct today only because no month in real data currently has both a
`HourRecord` and a zero-duration `Session` set. Not a currently-observed data-corruption bug, but
a structural violation of the "never combine both sources for the same month" rule
(`TASK_005A.md` Completion Criteria).

### 2.4 Duplicated aggregation logic — two locations

- `app/(tabs)/hours/index.tsx` (see §2.1) duplicates month-total resolution in a UI component.
- `src/data/stats.ts`'s `monthTotalFromSources()` (lines 73–87) is a near-identical
  reimplementation of `src/data/constants.ts`'s `monthTotal()`, apparently introduced to avoid a
  circular import between the two data-layer modules. `monthCellsForSY()` calls this duplicate
  instead of the canonical primitive.

Both violate `TASK_005A.md`'s Addendum rule: "`monthTotal()` remains the single authoritative
aggregation primitive" and "never duplicate aggregation logic elsewhere."

### 2.5 Service-year heat map: January–August resolve to the wrong calendar year

Root cause isolated to **presentation logic**, not aggregation math. `monthCellsForSY()` in
`src/data/stats.ts` computes each month's calendar year correctly
(`year = month >= 9 ? startYear : startYear + 1`). The defect is in
`src/components/HeatMap.tsx`, month-granularity branch (lines 60–98): a single `year` is derived
once from `cells[0].date` (the September cell) and reused to reconstruct a lookup key
(`` `${year}-${month}` ``) for *all twelve* grid positions, including January–August, which
belong to `startYear + 1`. The cell lookup (`cells.find((c) => c.date.startsWith(date))`) then
fails to find the correct entry for 8 of 12 months, rendering them as "no data" regardless of
how correctly the caller (`monthCellsForSY()`) computed the underlying cells. This affects both
the Hours Dashboard and the Statistics screen, since both render through the shared `HeatMap`
component.

### 2.6 No regression coverage for the September–August service-year boundary

No existing test exercises `HeatMap`'s grid-position-to-cell mapping, nor the September/December/
January/August boundary months specifically. `src/data/__tests__/stats.test.ts` covers
`monthCellsForSY()`'s date-key generation but not the component-level consumption that contains
the actual defect (§2.5).

### 2.7 Residual mojibake in `src/data/stats.ts`

Byte-level inspection confirms:
- Line 60: `syLabel.split("â")` — the delimiter is the Latin-1 mis-decoding of UTF-8 en dash
  bytes (`e2 80 93`) re-encoded as UTF-8 (`c3 a2 c2 80 c2 93`), i.e. it does not contain a real
  en dash. `svcYear()` in `constants.ts` produces labels using the correctly-encoded real en
  dash. The `.split()` call is therefore dead code — it silently no-ops (returns the original
  string as a single-element array), and `startYear` extraction only works because `parseInt()`
  stops at the first non-digit character regardless of what that character is.
- Doc comments at lines 2–3, 44, 58 contain further mojibake (garbled em dash / `§` sequences).

A repository-wide search of `app/` and `src/` (`grep -rlE 'ÃÂ|Ð[°-Ñ]|â€'`) found no other
occurrences in application source. The single other match, in `docs/AI_INFRASTRUCTURE.md`, is
intentional — prose documenting the corrupted byte patterns as part of the incident
post-mortem, not corruption itself.

### 2.8 ADR-007 review evidence incomplete or contradictory for TASK_005D/TASK_005E

`docs/STATUS.md` states that Architecture Review Checklist evidence for TASK_005D and
TASK_005E "не задокументирован" (undocumented). Contradicting this, `TASK_005E.md`'s own
verification table asserts `Architecture Review (ADR-007) | Passed` with no linked evidence
of the checklist having been run. `TASK_005D_IMPLEMENTATION_PLAN.md`'s Definition-of-Done
checklist (§6) is entirely unchecked (`[ ]`) despite `docs/STATUS.md` listing TASK_005D as
completed. No standalone checklist-result artifact exists for either task.

### 2.9 STATUS.md and task documents stale relative to release state

`docs/STATUS.md` frames `v0.4.4` as "релиз ожидается" (release pending) and lists a next-step
of pushing/tagging `v0.4.4`. In fact `v0.4.4` is already tagged (at `88769b7`), and `de32d87`
(a subsequent, unrelated routing fix) is unreleased on top of it. The document does not
accurately distinguish tagged-and-released state from current `main`.

### 2.10 `package-lock.json` version metadata stale

Top-level `"version"` (line 3) and `packages[""].version` (line 9) both read `"0.1.0"`;
`package.json`'s `"version"` is `"0.4.4"`. No dependency entries are implicated — this is
metadata-only drift.

### 2.11 `MonthlyHoursCard.tsx` — orphaned component (reported, not remediated here)

`src/components/MonthlyHoursCard.tsx` has no references anywhere in `app/` or `src/` outside
its own definition. Confirmed orphaned by repository-wide search. Per the approved scope,
default disposition is to report and defer to a future Hours UX redesign task — TASK_008 does
not remove it, since removal is not required for correctness and could affect a planned
redesign.

---

## 3. Architecture Violations Summary

| Invariant (source) | Status before TASK_008 | Violated by |
|---|---|---|
| No UI aggregates `HourRecord`/`Session` directly (`TASK_005A.md` Checklist) | Violated | §2.1 |
| Session-first authority is existence-based, not sum-based (`TASK_005_ARCHITECTURE.md` §7–§8) | Violated | §2.2 |
| Legacy and Session sources never combined for one month (`TASK_005A.md` Completion Criteria) | Structurally at risk | §2.2–§2.3 |
| `monthTotal()` is the single authoritative aggregation primitive, never duplicated (`TASK_005A.md` Addendum) | Violated | §2.4 |
| Service year enumerates Sep(startYear)–Aug(startYear+1) correctly at every consumption point | Violated at render time | §2.5 |
| ADR-007 checklist passes before deploy/tag (ADR-007) | Evidence incomplete/contradictory | §2.8 |

---

## 4. Implementation Stages

### Stage 0 — This document
Create this file. No implementation code changes. Separate commit.

### Stage 1 — Canonical aggregation and dashboard deduplication

**4.1 Internal relocation of `sessionsForMonth()` and `monthTotal()`.**
Move both functions from `src/data/constants.ts` into `src/data/stats.ts`, and re-export them
from `constants.ts` (matching the existing re-export pattern already used for
`trailingPace`/`projectMonthEnd`/`projectServiceYearEnd`/`monthCellsForSY`). This eliminates the
circular-import pressure that produced the `monthTotalFromSources()` duplicate (§2.4), so
`monthCellsForSY()` can call the canonical `monthTotal()` directly and `monthTotalFromSources()`
can be deleted.

Mandatory constraints on this move (per approval):
- All existing exported names from `@/data/constants` remain unchanged.
- All signatures remain unchanged.
- Every existing `import { monthTotal, sessionsForMonth, ... } from "@/data/constants"` call
  site continues to work with no import-path or behavior change.
- No circular dependency is introduced (`stats.ts` must not import from `constants.ts` after
  the move; `constants.ts` importing from `stats.ts` is the existing, already-established
  direction).
- No persisted data format or storage key changes.
- A repository-wide import/reference search is performed before and after the move to confirm
  no consumer breaks.
- The exact diff is shown before the commit that performs this move.

**4.2 Dashboard deduplication.**
`app/(tabs)/hours/index.tsx`: delete the hand-rolled `monthCells` aggregation and replace it
with a call to `monthCellsForSY(records, sessions, currentSY.sy)`, the same function already
correctly used by `app/(tabs)/hours/stats.tsx` and `TrendChart.tsx`. This removes the
sum-vs-existence bug (§2.2) as a consequence of removing the duplicate, rather than as a
separate hand-patch of the duplicate.

### Stage 2 — HeatMap cross-year correction

`src/components/HeatMap.tsx`: in the month-granularity branch, stop deriving one shared `year`
from `cells[0]` and reusing it for every grid position. Instead, resolve each grid cell from the
supplied `cells` array using each cell's own encoded year (already correct in every cell
produced by `monthCellsForSY()`), so September–December resolve against `startYear` and
January–August resolve against `startYear + 1`, per-cell, independent of grid position.

Per the approved smallest-safe-change constraint, this will most likely take the shape of a
small pure helper (e.g. `resolveMonthGridCells(cells, monthOrder)` or similar) extracted from
the component's render body, used both by the component and directly by a unit test — avoiding
a dependency on React Native component-testing machinery beyond what the repository already
uses (`jest-expo`, already a devDependency). No visual or layout change.

### Stage 3 — `stats.ts` UTF-8/mojibake correction

Replace the mis-encoded delimiter (`syLabel.split("â")`) with the real en dash matching
`svcYear()`'s output, and correct the doc-comment mojibake at lines 2–3, 44, 58. Verify the
written file directly from disk (not from editor/tool-cached content) with a byte-level grep for
the corrupted sequence, expecting zero matches. No repository-wide encoding rewrite; no
unrelated line-ending changes; no unrelated Cyrillic source rewritten.

### Stage 4 — Regression tests

Pure-function coverage (`stats.test.ts` / `aggregation.test.ts`):
- September of the start year → start-year key.
- December of the start year → start-year key.
- January of the following year → following-year key.
- August of the following year → following-year key.
- A service year mixing legacy-only and Session-authoritative months.
- A synthetic zero-`durationMinutes` Session (constructed directly, bypassing `SessionForm`'s UI
  guard) proving month authority is decided by Session existence, not by summed duration.
- A mixed month proving legacy and Session totals are never summed/combined.

Direct HeatMap-mapping coverage (per approval §2 of your clarifications): a test exercising the
extracted grid-position-to-cell helper (§Stage 2) directly, proving September–December resolve
to `startYear` and January–August resolve to `startYear + 1` in the actual mapped output the
component renders from — not only in the upstream `monthCellsForSY()` data.

Code and indispensable tests for Stages 1–4 may land as one atomic commit if separating them
would temporarily leave the repository incorrect or untested; the exact reasoning will be shown
before that commit, per the approved commit discipline.

### Stage 5 — Documentation reconciliation

After Stages 1–4 are implemented and verified:
- `docs/STATUS.md` rewritten to state plainly: `v0.4.4` is tagged at `88769b7`; `de32d87` and
  all TASK_008 work are unreleased on `main`; the retrospective ADR-007 review (§2.8 above)
  found the checklist evidence for TASK_005D/TASK_005E incomplete/contradictory; TASK_008
  remediates the defects in §2.1–§2.5, §2.7, §2.10; no deploy, tag, or real-device verification
  is claimed to have occurred as part of TASK_008.
- `TASK_005D_IMPLEMENTATION_PLAN.md` / `TASK_005E.md` receive concise historical annotations
  pointing to TASK_008 and this retrospective — their original content, dates, and completion
  claims as originally written are **not** rewritten, and the original ADR-007 gate is **not**
  retroactively marked as passed.
- `package-lock.json`: only the two Ministry package-version metadata fields identified in
  §2.10 are changed, by hand, to `"0.4.4"` — no dependency version, integrity hash, resolved
  URL, or graph-shape change. No `npm install` is run solely for this purpose; if any
  npm-generated command would produce broader lockfile churn, implementation stops and reports
  rather than proceeding.
- `MonthlyHoursCard.tsx` orphan status (§2.11) is recorded in `docs/STATUS.md` as deferred, not
  acted on.

### Stage 6 — AGENTS.md (separate, optional, final)

If still appropriate at that point, add `AGENTS.md` unchanged as its own commit. Not required
for TASK_008's functional completion; deferred rather than interrupting the corrective work if
time/usage becomes constrained.

---

## 5. Protected Invariants

TASK_008 must not, at any stage:
- Modify `src/data/seed.js` or any personal historical data.
- Change AsyncStorage keys (`mj_records_v1`, `mj_events_v1`, `mj_talks_v1`, `mj_sessions_v1`,
  `mj_timer_v1`) or any persisted entity's shape.
- Change the public contract (name, signature, import path) of any existing exported function
  in `@/data/constants`.
- Redesign or visually restructure `Home`, `Hours`, or `HeatMap` — only the year-resolution
  logic inside `HeatMap` changes; its visual output for correctly-resolved months is unchanged.
- Alter `StoreContext` as the sole data-access boundary.
- Alter existing Hours routes, except where a genuinely stale reference is found (none were
  found in code during the preliminary inspection — only `TASK_007_HOME_REDESIGN.md`'s prose
  references the pre-TASK_005D flat `/timer` route, which was accurate when that document was
  written and is left as an accurate historical record).
- Alter `/service` → `/hours` compatibility redirect behavior.
- Deploy, push, tag, or bump the release version.

---

## 6. Acceptance Criteria

**None of the following may be marked complete until implemented and verified. All are
currently unmet — this is the starting state, not a completion record.**

- [ ] `app/(tabs)/hours/index.tsx` no longer aggregates `records`/`sessions` directly; it calls
      `monthCellsForSY()`.
- [ ] Month authority (Session vs. legacy) is decided by Session existence, not by summed
      duration, at every call site.
- [ ] `monthTotalFromSources()` is removed; `monthCellsForSY()` calls the canonical
      `monthTotal()`.
- [ ] `sessionsForMonth()`/`monthTotal()` relocated to `stats.ts`, re-exported unchanged from
      `constants.ts`; repository-wide import search shows no broken consumer.
- [ ] `HeatMap`'s month-granularity rendering resolves September–December to the service year's
      start calendar year and January–August to the following calendar year, verified by a
      direct test of the extracted mapping helper.
- [ ] `src/data/stats.ts` contains no mojibake (byte-verified against disk).
- [ ] New regression tests (§Stage 4) exist and pass.
- [ ] Full suite passes: `npm test -- --runInBand`.
- [ ] `./node_modules/.bin/tsc --noEmit` is clean.
- [ ] A safe, non-deploying production web export succeeds without modifying tracked files.
- [ ] `docs/STATUS.md` accurately distinguishes tagged `v0.4.4` from unreleased `main`, records
      the retrospective ADR-007 findings, and claims no deploy/tag/device-verification.
- [ ] `package-lock.json` Ministry version metadata reads `0.4.4` with no other lockfile churn.
- [ ] `MonthlyHoursCard.tsx` orphan status is recorded, not acted on.
- [ ] No regression to any currently-passing test.

---

## 7. Regression-Test Requirements

See Stage 4 (§4, Stage 4) for the exact enumerated scenarios. Both the pure aggregation layer
(`stats.ts`) and the presentation-layer mapping inside `HeatMap.tsx` must be independently
covered, since the confirmed defect (§2.5) lives in the presentation layer and would not be
caught by aggregation-layer tests alone.

---

## 8. Documentation Requirements

See Stage 5. Summarized constraints (restated from approval, binding):
- Distinguish tagged `v0.4.4` from unreleased `main` at all times.
- Do not claim `de32d87` is included in `v0.4.4`.
- Do not claim a new release, deployment, or tag exists as a result of TASK_008.
- Do not claim historical ADR-007 compliance passed for TASK_005D/TASK_005E before `v0.4.4`.
- Record that the retrospective review found failures (§2.8) and which failures TASK_008
  remediates.
- Do not mark real-device (Expo Go / iPhone) verification complete unless actually performed on
  a physical device during this task (it will not be, per non-goals).
- Do not create `ROADMAP.md`, `CHANGELOG.md`, `PROGRESS.md`, or other ADR-006-implied-but-absent
  documents merely to satisfy the ADR-006 naming convention — that gap is reported separately,
  not filled here.

---

## 9. Explicit Non-Goals

TASK_008 does **not**:
- Redesign the Hours screen or the Home screen.
- Add colors or alter visual hierarchy.
- Implement authentication.
- Sanitize or modify seed data.
- Deploy to GitHub Pages.
- Push commits, create, or move any git tag.
- Bump to a new release version.
- Implement SQLite or any repository-layer/storage migration.
- Implement backup/import/export.
- Implement cloud synchronization (A-Lex Core integration remains ADR-003's future work).
- Introduce broad architecture changes beyond the internal relocation in §4.1.
- Start TASK_009 or TASK_010.
- Remove `MonthlyHoursCard.tsx`.
- Perform or claim real-device verification.

---

## 10. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| The `constants.ts` ⇄ `stats.ts` relocation breaks an import somewhere not yet found | Repository-wide search before and after the move; exact diff shown before commit; stop if any consumer needs an import-path or behavior change |
| `package-lock.json` correction triggers broader npm-generated churn | Hand-edit only the two identified fields; do not run `npm install` for this purpose; stop and report if broader churn appears necessary |
| `HeatMap` fix regresses correctly-resolved months (Sep–Dec) while fixing Jan–Aug | New test asserts all twelve months, not only the previously-broken ones |
| Documentation reconciliation drifts into rewriting historical facts | §8 constraints followed literally; TASK_005D/TASK_005E receive annotations only, not rewrites |
| Stage 1 combined commit becomes too large to review cleanly | Diff shown in full before the commit; reasoning for combining code+tests (if done) stated explicitly beforehand |

---

## 11. Rollback Considerations

Every stage lands as an isolated, reviewed commit on `main` with no push, deploy, or tag —
rollback for any stage is a plain `git revert` of that stage's commit, with no data-migration or
storage-format implications, since no persisted format changes at any stage. No stage depends on
a prior stage having been deployed (nothing is deployed during TASK_008), so stages can be
reverted independently if a defect is found in one without requiring the others to unwind.

---

## 12. Retrospective ADR-007 Findings (TASK_005D / TASK_005E)

This retrospective review — performed as part of TASK_008's preliminary audit, not at the time
of original implementation — found:

- **TASK_005D:** `TASK_005D_IMPLEMENTATION_PLAN.md` §6 Definition-of-Done is entirely unchecked
  in the source document, despite `docs/STATUS.md` listing TASK_005D as completed. No standalone
  Architecture Review Checklist artifact exists for TASK_005D. The architectural violations
  found in this audit (§2.1–§2.5) were introduced during TASK_005D's implementation
  (`app/(tabs)/hours/index.tsx`, `src/components/HeatMap.tsx` both originate from TASK_005D per
  `TASK_005D_IMPLEMENTATION_PLAN.md`'s file map) and were not caught by whatever review process
  did occur.
- **TASK_005E:** `TASK_005E.md`'s verification table claims "Architecture Review (ADR-007) |
  Passed," but no linked checklist evidence exists, and this claim cannot be verified against any
  artifact in the repository or git history. `src/data/stats.ts`, introduced in TASK_005E,
  carries the mojibake and duplicate-aggregation defects (§2.4, §2.7) — meaning if a checklist
  was in fact run, it did not catch either the "single authoritative aggregation primitive"
  violation or a UTF-8 encoding regression, both of which the frozen architecture and ADR-008
  (respectively) required to be caught.
- **Conclusion:** the retrospective review finds the ADR-007 gate was **not** demonstrably
  satisfied for either TASK_005D or TASK_005E before their respective releases (`v0.4.3` for
  TASK_005E; TASK_005D shipped without its own version bump per `docs/STATUS.md`). This is
  recorded here as a factual historical finding, not remediated retroactively — TASK_008 fixes
  the resulting defects going forward and documents the finding in `docs/STATUS.md` (Stage 5),
  without claiming the original gate passed.
