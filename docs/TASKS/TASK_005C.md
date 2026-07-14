# TASK_005C — Ministry Timer

**Status:** APPROVED — specification complete. Implementation NOT started;
awaiting explicit owner approval before any Timer code is written.
**Priority:** P0
**Phase:** Hours 2.0, phase C (see `TASK_005_ARCHITECTURE.md` §13)

## Architecture Status

TASK_005 Architecture: **FROZEN**, including the **TASK_005C Step 0** sync in
`docs/TASKS/TASK_005_ARCHITECTURE.md` §6 (flat `TimerState`, `firstStartedAt`
/ `startedAt` invariants, seconds-banking, mount-based recovery with a
15-minute threshold, conversion deferred to this document). Implementation
must conform to both exactly. Any further architectural change requires an
explicit review and update of the architecture document first — not an ad hoc
change during coding (ADR-004, ADR-007).

---

## 1. Product goals

Give the publisher a way to track a ministry outing **in real time** and file
it as a `Session` with minimal friction, on the app's real deployment target
(Expo Web / PWA, opened in Safari on iPhone), with two hard guarantees:

- **Zero lost time.** No outing time is lost to phone sleep, OS throttling,
  PWA tab backgrounding, app kill, or crash.
- **Zero phantom data.** An abandoned or forgotten timer never becomes a
  `Session` without an explicit user action (Stop → Save).

Plus: a **distraction-free, single, extensible screen** (future: territory,
companions, structured notes — added as sections, without navigation
changes), correct **without any background-execution dependency**.

---

## 2. Core architectural principle (governs everything below)

**The timer is a persisted timestamp, not a ticking counter.** Elapsed time
is always recomputed as `bankedSeconds + (now − startedAt)` on every render /
mount / foreground. The per-second on-screen tick is **purely cosmetic** — it
only refreshes the `HH:MM:SS` display; it never writes storage and is never
the source of truth.

Consequences:
- **Background behavior:** nothing to implement. Sleep, OS throttling, PWA
  backgrounding — all irrelevant; elapsed re-derives from the wall clock.
- **Persistence:** `mj_timer_v1` is written **only on discrete transitions**
  (Start / Pause / Resume / Stop / Save / Discard) — a handful of writes per
  outing, never per second.
- **Recovery:** whatever transition last persisted is the truth.

---

## 3. Routing

- New flat top-level route `app/timer.tsx`, a sibling of `app/entry.tsx`,
  `app/history.tsx`, `app/service.tsx`, using the same SafeAreaView /
  back-button header style already established in TASK_005B.
- `app/service.tsx`: the "Таймер" placeholder → `router.push("/timer")`.
  ("Статистика" stays an Alert placeholder — TASK_005E.)
- The `app/(tabs)/hours/` nested-stack restructuring and the move to
  `hours/timer.tsx` are **TASK_005D**, not this task. (Same precedent as
  TASK_005B shipping `entry`/`history` as flat routes.)

---

## 4. Data model & storage (from Step 0 §6 — restated, not re-decided)

New storage key: `mj_timer_v1` — a single `TimerState` object (not an array).

```
TimerState = {
  status: "idle" | "running" | "paused"
  startedAt: string | null        // start of the CURRENT active segment
  firstStartedAt: string | null   // first Start of the outing (bookend)
  bankedSeconds: number           // active time banked across segments
}
```

Invariants are **mandatory** (see §6 of the architecture doc):
`firstStartedAt` is write-once (idle → running), cleared only on return to
idle; `startedAt` is non-null only while `running`; save is a UI overlay over
`paused` (no persisted `"saving"`); defensive normalization is required.

`TimerState` is **control state for crash recovery, not a reporting entity** —
it never feeds aggregation and is never read by any statistics/Home/Hours
code. Adding `mj_timer_v1` to the storage table in `docs/ARCHITECTURE.md` is
part of this task's Definition of Done.

No changes to `Session`, `HourRecord`, `StoreContext`, or the aggregation
layer.

---

## 5. State machine

**Persisted states** (the only three ever written to `mj_timer_v1`):
`idle`, `running`, `paused`.

| From | Action | To | Effect |
|------|--------|----|--------|
| `idle` | Start | `running` | `startedAt = now`; `firstStartedAt = now`; `bankedSeconds = 0` |
| `running` | Pause | `paused` | `bankedSeconds += (now − startedAt)`; `startedAt = null` |
| `paused` | Resume | `running` | `startedAt = now` (`firstStartedAt`, `bankedSeconds` untouched) |
| `running` | Stop | `paused` + save overlay | `bankedSeconds += (now − startedAt)`; `startedAt = null`; open Save overlay |
| `paused` | Stop | `paused` + save overlay | open Save overlay (bankedSeconds already final) |
| `paused` (overlay) | Save | `idle` | build `Session` → `saveSession()`; clear timer to `idle` |
| `paused` (overlay) | Discard (confirmed) | `idle` | clear timer to `idle`, no `Session` |
| `paused` (overlay) | Continue | `paused` / `running` | close overlay; user may Resume |

**Key point:** "Stop" banks the final segment and moves to `paused`, then
opens the Save overlay. If the app is killed while the overlay is open, it
**recovers as a plain `paused` timer with no data lost** — the user simply
Stops again. The overlay is UI only; it is never a persisted status.

---

## 6. User flows

- **A — Track an outing.** service → Timer → Start → (pocket the phone; the
  app may be backgrounded/killed) → return → Stop → adjust duration/note →
  Save → `Session` created (`source: "timer"`) → totals update immediately.
- **B — Pause mid-outing.** running → Pause → (break) → Resume → … → Stop →
  Save. Duration counts active time only.
- **C — Recover a running timer.** open Timer after the app was
  killed/backgrounded → §7 recovery decides seamless-restore vs Recovery
  Screen.
- **D — Discard.** running/paused → Stop → Discard → confirm → nothing saved.
- **E — Leave without stopping.** running → Back / background → timer keeps
  running as persisted state; **no "discard running timer?" prompt** —
  leaving the screen is not stopping (symmetric with the timestamp model).

---

## 7. Recovery (mount-based)

Evaluated when the Timer screen **mounts** (cold launch or in-app
navigation). Elapsed is always recomputed from persisted timestamps.

| Persisted state | Condition | Outcome |
|-----------------|-----------|---------|
| `idle` | — | Idle screen |
| `paused` | — | Restore paused immediately (no active clock; nothing accrues) |
| `running` | `now − startedAt < 15 min` | Restore running immediately (the common "backgrounded for a minute" case) |
| `running` | `now − startedAt ≥ 15 min` | **Recovery Screen**: show start time + elapsed + `Continue` / `Stop` / `Discard`. User decides — no hard cutoff, no auto-discard |
| `running` | `now < startedAt` (clock moved back) | Clamp elapsed to `bankedSeconds`; ask the user to confirm before continuing |

The 15-minute threshold is measured from `startedAt` (the last Start/Resume),
which the flat model already encodes — no extra field needed. `paused` never
triggers the Recovery Screen (nothing accrues while paused). A global
"timer running" indicator on other screens is **out of scope — TASK_005D**.

---

## 8. Defensive normalization (mandatory)

`mj_timer_v1` is parsed through a single normalization function before use.
Invalid/inconsistent state MUST NOT crash the app: where a safe state can be
reconstructed the data is preserved; otherwise it falls back to `idle`.

| Persisted condition | Normalization |
|---------------------|---------------|
| JSON corrupt / key missing | → `idle` |
| `status` not in `{idle, running, paused}` | → `idle` |
| `bankedSeconds` not a number / negative / NaN | clamp to `0` |
| `running` but `startedAt` empty/unparseable | if `bankedSeconds > 0` → `paused`; else → `idle` |
| `running`, `now < startedAt` (clock rollback) | clamp elapsed to `bankedSeconds` + ask to confirm (see §7) |
| `paused` but `startedAt` non-null | ignore `startedAt`, keep `paused` + `bankedSeconds` |
| `idle` but `bankedSeconds > 0` / `startedAt` set | **corrupted:** log for diagnostics, clear `bankedSeconds`/`startedAt`/`firstStartedAt`, go `idle` |
| `running` valid but `firstStartedAt` empty | best-effort: `firstStartedAt := startedAt` |

Normalization never modifies a *valid* `firstStartedAt` (write-once invariant
§4).

---

## 9. Session creation

On **Save** the timer builds one `Session` and persists it through the
existing `StoreContext.saveSession()` — no store changes:

- `source: "timer"`
- `durationMinutes`: from `bankedSeconds` via the §10 rounding rule
  (prefilled, user-editable in the Save overlay)
- `startTime`: `firstStartedAt` (informational bookend)
- `endTime`: the Stop moment (informational bookend)
- `date`: defaults to the **start** date (`firstStartedAt`'s day), editable —
  this resolves the midnight-crossing case (start 23:50, stop 00:10)
- `note`: optional, from the overlay

The Save overlay reuses TASK_005B's `SessionForm` field language (date /
duration-in-minutes / note) for consistency; it prefills from the timer and
sets `source: "timer"`. After a successful Save the timer resets to `idle`
(`mj_timer_v1` cleared), so a subsequent Start is a fresh outing.

---

## 10. Rounding rule (product decision — resolved)

Conversion from `bankedSeconds` to `Session.durationMinutes` happens **exactly
once, during Save** — never while the timer is running or paused:

- `durationMinutes = ceil(bankedSeconds / 60)` — round **up** to the next
  whole minute.
- If `bankedSeconds == 0` → **Save is disabled** (no zero-minute session can
  be created). The user may Discard or Continue tracking.
- If `bankedSeconds > 0` → **Save is always allowed**; the minimum possible
  result is 1 minute, so a legitimate short visit is never lost.
- The calculated value is **prefilled and remains editable** in the Save
  overlay — the user can make a manual correction before committing the
  Session.

Rationale: `ceil` combined with the `> 0` rule avoids zero-minute sessions
*and* avoids discarding legitimate short sessions, keeps the timer simple, and
still lets the user correct the value before commit.

---

## 11. UX / UI

Single screen, four visual states; matches the TASK_005B header style.

- **Idle:** intentionally minimal — a single prominent **Start** button and
  nothing else. Any history/summary glance belongs to History or the future
  Dashboard (TASK_005D), not the Idle state.
- **Running:** large elapsed (`H:MM:SS`, live-ticking); **Pause** + **Stop**;
  subtle "started HH:MM" line and a running indicator.
- **Paused:** elapsed frozen and visually dimmed with a "Paused" badge;
  **Resume** + **Stop**.
- **Save overlay** (over paused): date (default = start date), duration
  (prefilled, editable, minutes), note; **Save** / **Discard** (Discard
  confirms). **Continue** closes the overlay without losing tracked time.
- **Recovery Screen** (§7, `running ≥ 15 min` on mount): start time, elapsed,
  and `Continue` / `Stop` / `Discard`.

No `<Modal>` component is used for Timer (architecture §3) — the Save step is
inline on the same screen.

---

## 12. Store architecture

- A dedicated **`useTimer` hook** owns the `mj_timer_v1` lifecycle (read /
  normalize / transition / persist), mirroring the existing `useStorage`
  pattern. It is screen-scoped for TASK_005C (lifting it to a provider for a
  global indicator is TASK_005D).
- The **only** domain write goes through the existing
  `StoreContext.saveSession()` — honoring ADR-003 (StoreContext is the single
  data-access point for domain data). Timer control state is deliberately
  **not** placed in `StoreContext`, because it is ephemeral crash-recovery
  state, not domain data bound for A-Lex Core.
- **No `StoreContext` changes, no `Session` model changes, no
  aggregation-layer changes.**

Pure/derivation logic lives as pure functions in `src/data/` (e.g.
`elapsedSeconds`, the transition reducer, `timerToSession`, the recovery
classifier, the normalizer) — matching the existing style of
`hoursForMonth`/`monthProgress`; **no logic inside components**.

---

## 13. Aggregation impact

None. A timer produces an ordinary `source: "timer"` `Session`; §7/§8 of the
architecture (single authoritative source per month) are untouched. The only
interaction worth an explicit test: a timer `Session` for the **current
month** correctly makes that month **Session-authoritative** (per §8), and
Home's `TodayCard` / current-service-year grid reflect it — consistent with
TASK_005B's regression guarantees.

---

## 14. Non-Goals

- No Statistics, Charts, Heat Map, Pace, or Projection (TASK_005E).
- No `app/(tabs)/hours/` restructuring, no Month Details, no Hours Dashboard
  (TASK_005D).
- No global "timer running" indicator / cross-screen recovery (TASK_005D).
- No background execution: no `expo-background-fetch`, no local notifications,
  no Live Activities. (`expo-keep-awake` is a native-only nice-to-have,
  deferred — not required for correctness and unavailable on the PWA target.)
- No `StoreContext` / `Session` / aggregation changes.
- No `Session.type` / credit-hour classification (architecture §6).
- No deploy, no Git tag (ADR-007 gate first).

---

## 15. Testing strategy

Pure functions are the testable core (no RN needed):

- `elapsedSeconds(state, now)` — running / paused / idle; with `bankedSeconds`;
  `now < startedAt` clamp.
- Transition reducer (start/pause/resume/stop) — property: **active time is
  conserved across pause/resume**; `firstStartedAt` is set once and never
  moved by Pause/Resume/Stop.
- `timerToSession(state, now, {date, note})` — correct `source`,
  `durationMinutes` (§10 `ceil`: `bankedSeconds == 0` ⇒ Save disabled; any
  `bankedSeconds > 0` ⇒ result ≥ 1 minute), and `startTime`/`endTime`
  bookends.
- Recovery classifier — all §7 rows (idle / paused / running-<15 /
  running-≥15 / clock-rollback).
- Normalizer — every §8 row, including the corrupted `idle`-with-data case
  and the `firstStartedAt` best-effort fill.

Component / render tests: the four screen states + Recovery Screen; a
**crash-recovery test** that seeds `mj_timer_v1` and mounts.

Aggregation regression: one test asserting a timer `Session` for the current
month flips that month to Session-authoritative (§13).

`tsc --noEmit` and the full suite pass.

---

## 16. Architecture Review considerations (ADR-007)

- Single data-access point preserved: the `Session` is written via
  `StoreContext.saveSession()`; timer control state is justified as non-domain
  (§12).
- `src/data/seed.js` untouched.
- Aggregation §7/§8 preserved; timer only produces normal `Session`s.
- The §6 refinements this task depends on already landed as the **Step 0
  commit** before any code (this document's precondition).
- `mj_timer_v1` added to the `docs/ARCHITECTURE.md` storage table.
- Buildable/committable per stage (one-stage-one-commit).
- No deploy / no tag until the Architecture Review Checklist passes.

---

## Definition of Done

- Step 0 (§6 architecture sync) landed as its own commit before any code. ✅
  (`7bff15f`, done during design)
- This document approved before any implementation code.
- Timer: Start / Pause / Resume / Stop / Save / Discard all working, producing
  a correct `source: "timer"` `Session` via `saveSession()`.
- `mj_timer_v1` persisted on transitions only; survives reload / kill; recovery
  behaves per §7; defensive normalization per §8; no background execution.
- Elapsed verified correct after backgrounding (timestamp recompute).
- Rounding rule §10 implemented (`ceil(bankedSeconds / 60)`; Save disabled at
  `bankedSeconds == 0`, always allowed when `> 0`; editable prefill),
  conversion exactly once at Save.
- `route service → /timer` wired; flat `app/timer.tsx` matches the TASK_005B
  header style.
- `mj_timer_v1` added to `docs/ARCHITECTURE.md` storage table.
- Tests per §15 (pure functions, recovery, normalization, crash-recovery
  mount, aggregation regression); `tsc --noEmit` + full suite pass.
- No `StoreContext` / `Session` / aggregation regressions.
- Commit(s) pushed. **No deploy, no Git tag** until the Architecture Review
  Checklist (ADR-007) passes.
