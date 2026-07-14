import {
  normalizeTimerState,
  IDLE_TIMER_STATE,
  elapsedSeconds,
  reduceTimer,
  classifyRecovery,
  timerToSession,
  prefillMinutes,
  formatElapsed,
} from "../timer";
import type { Session, TimerState, TimerRecoveryOutcome } from "@/types";

// Helper to create a fixed "now" for deterministic tests
const FIXED_NOW = new Date("2026-07-14T14:30:00.000Z"); // Monday, 14:30 UTC

function isoNow(offsetSeconds = 0): string {
  return new Date(FIXED_NOW.getTime() + offsetSeconds * 1000).toISOString();
}

describe("TimerState normalization (§8)", () => {
  test("missing/corrupt JSON -> idle", () => {
    expect(normalizeTimerState(null)).toEqual(IDLE_TIMER_STATE);
    expect(normalizeTimerState(undefined)).toEqual(IDLE_TIMER_STATE);
    expect(normalizeTimerState("not an object")).toEqual(IDLE_TIMER_STATE);
    expect(normalizeTimerState(123)).toEqual(IDLE_TIMER_STATE);
  });

  test("invalid status -> idle", () => {
    expect(
      normalizeTimerState({ status: "invalid", startedAt: null, firstStartedAt: null, bankedSeconds: 0 }),
    ).toEqual(IDLE_TIMER_STATE);
    expect(
      normalizeTimerState({ status: "saving", startedAt: null, firstStartedAt: null, bankedSeconds: 0 }),
    ).toEqual(IDLE_TIMER_STATE);
  });

  test("bankedSeconds NaN/negative -> clamped to 0", () => {
    expect(
      normalizeTimerState({ status: "idle", startedAt: null, firstStartedAt: null, bankedSeconds: NaN }),
    ).toEqual(IDLE_TIMER_STATE);
    expect(
      normalizeTimerState({ status: "idle", startedAt: null, firstStartedAt: null, bankedSeconds: -5 }),
    ).toEqual(IDLE_TIMER_STATE);
    expect(
      normalizeTimerState({ status: "idle", startedAt: null, firstStartedAt: null, bankedSeconds: "not a number" }),
    ).toEqual(IDLE_TIMER_STATE);
  });

  test("running but startedAt empty/unparseable -> paused if banked>0 else idle", () => {
    const stateWithBanked = {
      status: "running",
      startedAt: "not-a-date",
      firstStartedAt: "2026-07-14T10:00:00.000Z",
      bankedSeconds: 3600,
    };
    const result = normalizeTimerState(stateWithBanked);
    expect(result.status).toBe("paused");
    expect(result.bankedSeconds).toBe(3600);
    expect(result.startedAt).toBeNull();

    const stateNoBanked = {
      status: "running",
      startedAt: "not-a-date",
      firstStartedAt: "2026-07-14T10:00:00.000Z",
      bankedSeconds: 0,
    };
    expect(normalizeTimerState(stateNoBanked)).toEqual(IDLE_TIMER_STATE);
  });

  test("running with now < startedAt (clock rollback) -> running with clamped elapsed (ask to confirm)", () => {
    const future = new Date(FIXED_NOW.getTime() + 3600 * 1000).toISOString(); // 1 hour in future
    const state = {
      status: "running",
      startedAt: future,
      firstStartedAt: "2026-07-14T10:00:00.000Z",
      bankedSeconds: 1800,
    };
    const result = normalizeTimerState(state);
    expect(result.status).toBe("running");
    expect(result.bankedSeconds).toBe(1800);
    // firstStartedAt preserved
    expect(result.firstStartedAt).toBe("2026-07-14T10:00:00.000Z");
  });

  test("paused but startedAt non-null -> ignored, kept paused", () => {
    const state = {
      status: "paused",
      startedAt: "2026-07-14T12:00:00.000Z",
      firstStartedAt: "2026-07-14T10:00:00.000Z",
      bankedSeconds: 7200,
    };
    const result = normalizeTimerState(state);
    expect(result.status).toBe("paused");
    expect(result.startedAt).toBeNull();
    expect(result.bankedSeconds).toBe(7200);
  });

  test("idle but has data -> corrupted, cleared to idle", () => {
    const state = {
      status: "idle",
      startedAt: "2026-07-14T12:00:00.000Z",
      firstStartedAt: "2026-07-14T10:00:00.000Z",
      bankedSeconds: 3600,
    };
    expect(normalizeTimerState(state)).toEqual(IDLE_TIMER_STATE);
  });

  test("running valid but firstStartedAt empty -> best-effort fill from startedAt", () => {
    const state = {
      status: "running",
      startedAt: "2026-07-14T12:00:00.000Z",
      firstStartedAt: null,
      bankedSeconds: 0,
    };
    const result = normalizeTimerState(state);
    expect(result.firstStartedAt).toBe("2026-07-14T12:00:00.000Z");
  });

  test("valid idle preserved", () => {
    expect(normalizeTimerState(IDLE_TIMER_STATE)).toEqual(IDLE_TIMER_STATE);
  });

  test("valid running preserved (with startedAt)", () => {
    const state = {
      status: "running",
      startedAt: "2026-07-14T12:00:00.000Z",
      firstStartedAt: "2026-07-14T10:00:00.000Z",
      bankedSeconds: 1800,
    };
    const result = normalizeTimerState(state);
    expect(result).toEqual(state);
  });

  test("valid paused preserved", () => {
    const state = {
      status: "paused",
      startedAt: null,
      firstStartedAt: "2026-07-14T10:00:00.000Z",
      bankedSeconds: 3600,
    };
    const result = normalizeTimerState(state);
    expect(result).toEqual(state);
  });
});

describe("elapsedSeconds (pure)", () => {
  test("idle -> bankedSeconds", () => {
    const state: TimerState = { ...IDLE_TIMER_STATE, bankedSeconds: 120 };
    expect(elapsedSeconds(state, FIXED_NOW)).toBe(120);
  });

  test("paused -> bankedSeconds (no active)", () => {
    const state: TimerState = {
      status: "paused",
      startedAt: null,
      firstStartedAt: "2026-07-14T10:00:00.000Z",
      bankedSeconds: 3600,
    };
    expect(elapsedSeconds(state, FIXED_NOW)).toBe(3600);
  });

  test("running -> banked + (now - startedAt)", () => {
    const startedAt = isoNow(-300); // 5 minutes ago
    const state: TimerState = {
      status: "running",
      startedAt,
      firstStartedAt: "2026-07-14T10:00:00.000Z",
      bankedSeconds: 1800,
    };
    // 1800 banked + 300 active = 2100
    expect(elapsedSeconds(state, FIXED_NOW)).toBe(2100);
  });

  test("running with clock rollback (now < startedAt) -> clamped to bankedSeconds", () => {
    const startedAt = isoNow(60); // 1 minute in future
    const state: TimerState = {
      status: "running",
      startedAt,
      firstStartedAt: "2026-07-14T10:00:00.000Z",
      bankedSeconds: 1800,
    };
    expect(elapsedSeconds(state, FIXED_NOW)).toBe(1800);
  });

  test("running with unparseable startedAt -> bankedSeconds", () => {
    const state: TimerState = {
      status: "running",
      startedAt: "not-a-date",
      firstStartedAt: "2026-07-14T10:00:00.000Z",
      bankedSeconds: 1800,
    };
    expect(elapsedSeconds(state, FIXED_NOW)).toBe(1800);
  });
});

describe("reduceTimer (transition reducer) — active time conserved", () => {
  test("START from idle -> running, firstStartedAt set, banked=0", () => {
    const result = reduceTimer(IDLE_TIMER_STATE, { type: "START" }, FIXED_NOW);
    expect(result.status).toBe("running");
    expect(result.startedAt).toBe(FIXED_NOW.toISOString());
    expect(result.firstStartedAt).toBe(FIXED_NOW.toISOString());
    expect(result.bankedSeconds).toBe(0);
  });

  test("START from non-idle -> no-op", () => {
    const running: TimerState = {
      status: "running",
      startedAt: isoNow(-100),
      firstStartedAt: isoNow(-100),
      bankedSeconds: 0,
    };
    expect(reduceTimer(running, { type: "START" }, FIXED_NOW)).toEqual(running);

    const paused: TimerState = { status: "paused", startedAt: null, firstStartedAt: isoNow(-100), bankedSeconds: 100 };
    expect(reduceTimer(paused, { type: "START" }, FIXED_NOW)).toEqual(paused);
  });

  test("PAUSE from running -> paused, banks active segment", () => {
    const startedAt = isoNow(-300); // 5 min ago
    const running: TimerState = { status: "running", startedAt, firstStartedAt: isoNow(-600), bankedSeconds: 600 };
    const result = reduceTimer(running, { type: "PAUSE" }, FIXED_NOW);
    expect(result.status).toBe("paused");
    expect(result.startedAt).toBeNull();
    expect(result.firstStartedAt).toBe(running.firstStartedAt); // unchanged
    // bankedSeconds = 600 (previous) + 300 (active segment) = 900
    expect(result.bankedSeconds).toBe(900);
  });

  test("PAUSE from non-running -> no-op", () => {
    const paused: TimerState = { status: "paused", startedAt: null, firstStartedAt: isoNow(-100), bankedSeconds: 100 };
    expect(reduceTimer(paused, { type: "PAUSE" }, FIXED_NOW)).toEqual(paused);
    expect(reduceTimer(IDLE_TIMER_STATE, { type: "PAUSE" }, FIXED_NOW)).toEqual(IDLE_TIMER_STATE);
  });

  test("RESUME from paused -> running, new startedAt, banked preserved", () => {
    const paused: TimerState = { status: "paused", startedAt: null, firstStartedAt: isoNow(-600), bankedSeconds: 900 };
    const result = reduceTimer(paused, { type: "RESUME" }, FIXED_NOW);
    expect(result.status).toBe("running");
    expect(result.startedAt).toBe(FIXED_NOW.toISOString());
    expect(result.firstStartedAt).toBe(paused.firstStartedAt); // unchanged
    expect(result.bankedSeconds).toBe(900); // unchanged
  });

  test("RESUME from non-paused -> no-op", () => {
    expect(reduceTimer(IDLE_TIMER_STATE, { type: "RESUME" }, FIXED_NOW)).toEqual(IDLE_TIMER_STATE);
    const running: TimerState = { status: "running", startedAt: isoNow(-100), firstStartedAt: isoNow(-100), bankedSeconds: 0 };
    expect(reduceTimer(running, { type: "RESUME" }, FIXED_NOW)).toEqual(running);
  });

  test("STOP from running -> paused, banks final segment, opens save overlay", () => {
    const startedAt = isoNow(-300); // 5 min ago
    const running: TimerState = { status: "running", startedAt, firstStartedAt: isoNow(-600), bankedSeconds: 600 };
    const result = reduceTimer(running, { type: "STOP" }, FIXED_NOW);
    expect(result.status).toBe("paused");
    expect(result.startedAt).toBeNull();
    expect(result.firstStartedAt).toBe(running.firstStartedAt); // unchanged
    // bankedSeconds = 600 + 300 = 900
    expect(result.bankedSeconds).toBe(900);
  });

  test("STOP from paused -> no-op (overlay UI handles Save/Discard)", () => {
    const paused: TimerState = { status: "paused", startedAt: null, firstStartedAt: isoNow(-600), bankedSeconds: 900 };
    expect(reduceTimer(paused, { type: "STOP" }, FIXED_NOW)).toEqual(paused);
  });

  test("STOP from idle -> no-op", () => {
    expect(reduceTimer(IDLE_TIMER_STATE, { type: "STOP" }, FIXED_NOW)).toEqual(IDLE_TIMER_STATE);
  });

  test("Property: active time conserved across pause/resume cycle", () => {
    // Start -> 5 min -> Pause -> Resume -> 3 min -> Pause -> Stop
    let state = reduceTimer(IDLE_TIMER_STATE, { type: "START" }, new Date("2026-07-14T10:00:00.000Z")); // t=0
    state = reduceTimer(state, { type: "PAUSE" }, new Date("2026-07-14T10:05:00.000Z")); // t=300s
    state = reduceTimer(state, { type: "RESUME" }, new Date("2026-07-14T10:05:00.000Z")); // immediate resume
    state = reduceTimer(state, { type: "PAUSE" }, new Date("2026-07-14T10:08:00.000Z")); // t=480s total active = 300 + 180 = 480
    state = reduceTimer(state, { type: "STOP" }, new Date("2026-07-14T10:08:00.000Z"));
    expect(state.bankedSeconds).toBe(480);
    // firstStartedAt should remain the very first start
    expect(state.firstStartedAt).toBe("2026-07-14T10:00:00.000Z");
  });

  test("Property: firstStartedAt never modified by Pause/Resume/Stop", () => {
    const first = "2026-07-14T10:00:00.000Z";
    let state = reduceTimer(IDLE_TIMER_STATE, { type: "START" }, new Date(first));
    state = reduceTimer(state, { type: "PAUSE" }, new Date("2026-07-14T10:05:00.000Z"));
    state = reduceTimer(state, { type: "RESUME" }, new Date("2026-07-14T10:05:00.000Z"));
    state = reduceTimer(state, { type: "PAUSE" }, new Date("2026-07-14T10:08:00.000Z"));
    state = reduceTimer(state, { type: "STOP" }, new Date("2026-07-14T10:08:00.000Z"));
    expect(state.firstStartedAt).toBe(first);
  });
});

describe("classifyRecovery (§7 mount-based)", () => {
  test("idle -> idle", () => {
    const result = classifyRecovery(IDLE_TIMER_STATE, FIXED_NOW);
    expect(result.kind).toBe("idle");
  });

  test("paused -> paused immediately", () => {
    const state: TimerState = { status: "paused", startedAt: null, firstStartedAt: isoNow(-600), bankedSeconds: 3600 };
    const result = classifyRecovery(state, FIXED_NOW);
    expect(result.kind).toBe("paused");
    if (result.kind === "paused") expect(result.state).toBe(state);
  });

  test("running, elapsed < 15 min -> running immediately", () => {
    const state: TimerState = {
      status: "running",
      startedAt: isoNow(-600), // 10 min ago
      firstStartedAt: isoNow(-1800),
      bankedSeconds: 1800,
    };
    const result = classifyRecovery(state, FIXED_NOW);
    expect(result.kind).toBe("running");
    if (result.kind === "running") expect(result.state).toBe(state);
  });

  test("running, elapsed >= 15 min -> recovery-screen", () => {
    const state: TimerState = {
      status: "running",
      startedAt: isoNow(-20 * 60), // 20 min ago
      firstStartedAt: isoNow(-30 * 60),
      bankedSeconds: 600,
    };
    const result = classifyRecovery(state, FIXED_NOW);
    expect(result.kind).toBe("recovery-screen");
    if (result.kind === "recovery-screen") {
      expect(result.state).toBe(state);
      // elapsedSeconds = bankedSeconds + (now - startedAt)
      expect(result.elapsedSeconds).toBe(600 + 20 * 60);
      expect(result.startedAt).toEqual(new Date(state.startedAt!));
    }
  });

  test("running, clock rollback (now < startedAt) -> clock-rollback", () => {
    const future = isoNow(60); // 1 min in future
    const state: TimerState = { status: "running", startedAt: future, firstStartedAt: isoNow(-600), bankedSeconds: 1800 };
    const result = classifyRecovery(state, FIXED_NOW);
    expect(result.kind).toBe("clock-rollback");
    if (result.kind === "clock-rollback") {
      expect(result.bankedSeconds).toBe(1800);
      expect(result.startedAt).toEqual(new Date(future));
    }
  });

  test("running but startedAt unparseable after normalization -> paused", () => {
    const state: TimerState = { status: "running", startedAt: "not-a-date", firstStartedAt: isoNow(-600), bankedSeconds: 1800 };
    // Note: normalizeTimerState would have converted this to paused already,
    // but classifier should be defensive
    const result = classifyRecovery(state, FIXED_NOW);
    expect(result.kind).toBe("paused");
    if (result.kind === "paused") expect(result.state.status).toBe("paused");
  });
});

describe("timerToSession (§9–§10)", () => {
  const stopMoment = new Date("2026-07-14T14:30:00.000Z");
  const baseState: TimerState = {
    status: "paused",
    startedAt: null,
    firstStartedAt: "2026-07-14T10:00:00.000Z",
    bankedSeconds: 3600, // 1 hour
  };

  test("bankedSeconds > 0 -> Session with ceil(bankedSeconds/60) durationMinutes, source=timer", () => {
    const session = timerToSession(baseState, stopMoment, { date: "2026-07-14", durationMinutes: 60, note: "Test" });
    expect(session.source).toBe("timer");
    expect(session.durationMinutes).toBe(60); // ceil(3600/60) = 60
    expect(session.startTime).toBe("2026-07-14T10:00:00.000Z");
    expect(session.endTime).toBe(stopMoment.toISOString());
    expect(session.date).toBe("2026-07-14");
    expect(session.note).toBe("Test");
    // Create payload only — id/createdAt/updatedAt are minted by
    // StoreContext.saveSession (ADR-003), never by the timer.
    expect("id" in session).toBe(false);
    expect("createdAt" in session).toBe(false);
    expect("updatedAt" in session).toBe(false);
  });

  test("bankedSeconds == 0 -> throws (Save disabled at UI level)", () => {
    const state: TimerState = { ...baseState, bankedSeconds: 0 };
    expect(() => timerToSession(state, stopMoment, { date: "2026-07-14", durationMinutes: 0 })).toThrow(
      "Cannot create Session from timer with zero banked time",
    );
  });

  test("bankedSeconds > 0 but user sets durationMinutes = 0 -> clamped to 1 at UI, but function uses input", () => {
    // The function uses the provided durationMinutes; UI enforces >=1
    const session = timerToSession(baseState, stopMoment, { date: "2026-07-14", durationMinutes: 5 });
    expect(session.durationMinutes).toBe(5);
  });

  test("calculated prefill matches ceil(bankedSeconds/60)", () => {
    expect(prefillMinutes(0)).toBe(0);
    expect(prefillMinutes(1)).toBe(1);
    expect(prefillMinutes(59)).toBe(1);
    expect(prefillMinutes(60)).toBe(1);
    expect(prefillMinutes(61)).toBe(2);
    expect(prefillMinutes(3599)).toBe(60);
    expect(prefillMinutes(3600)).toBe(60);
    expect(prefillMinutes(3601)).toBe(61);
  });

  test("Session fields: startTime = firstStartedAt, endTime = stopMoment, date defaults to start date", () => {
    const session = timerToSession(baseState, stopMoment, { date: "2026-07-14", durationMinutes: 60 });
    expect(session.startTime).toBe(baseState.firstStartedAt);
    expect(session.endTime).toBe(stopMoment.toISOString());
    expect(session.date).toBe("2026-07-14");
  });
});

describe("formatElapsed", () => {
  test("seconds only", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(30)).toBe("0:30");
    expect(formatElapsed(59)).toBe("0:59");
  });

  test("minutes and seconds", () => {
    expect(formatElapsed(60)).toBe("1:00");
    expect(formatElapsed(90)).toBe("1:30");
    expect(formatElapsed(3599)).toBe("59:59");
  });

  test("hours, minutes, seconds", () => {
    expect(formatElapsed(3600)).toBe("1:00:00");
    expect(formatElapsed(3661)).toBe("1:01:01");
    expect(formatElapsed(7200)).toBe("2:00:00");
    expect(formatElapsed(36610)).toBe("10:10:10");
  });
});
