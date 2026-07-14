// Timer control-state model and pure logic (TASK_005C).
// This is crash-recovery state only (never feeds aggregation).
// Storage key: mj_timer_v1

import type { Session } from "@/types";

export type TimerStatus = "idle" | "running" | "paused";

export type TimerState = {
  status: TimerStatus;
  startedAt: string | null;      // start of CURRENT active segment (ISO datetime)
  firstStartedAt: string | null; // first Start of the outing (bookend)
  bankedSeconds: number;         // active time banked across segments
};

export type TimerRecoveryOutcome =
  | { kind: "idle" }
  | { kind: "paused"; state: TimerState }
  | { kind: "running"; state: TimerState }
  | { kind: "recovery-screen"; state: TimerState; elapsedSeconds: number; startedAt: Date }
  | { kind: "clock-rollback"; bankedSeconds: number; startedAt: Date };

// ---------------------------------------------------------------------------
// Default / empty state
// ---------------------------------------------------------------------------
export const IDLE_TIMER_STATE: TimerState = {
  status: "idle",
  startedAt: null,
  firstStartedAt: null,
  bankedSeconds: 0,
};

// ---------------------------------------------------------------------------
// Defensive normalization (§8) — single entry point for any persisted value
// ---------------------------------------------------------------------------
export function normalizeTimerState(raw: unknown): TimerState {
  // JSON corrupt / key missing
  if (!raw || typeof raw !== "object") return IDLE_TIMER_STATE;

  const obj = raw as Record<string, unknown>;

  // status not in {idle, running, paused}
  const status = obj.status;
  if (status !== "idle" && status !== "running" && status !== "paused") {
    return IDLE_TIMER_STATE;
  }

  // bankedSeconds not a number / negative / NaN
  let bankedSeconds = typeof obj.bankedSeconds === "number" ? obj.bankedSeconds : 0;
  if (!Number.isFinite(bankedSeconds) || bankedSeconds < 0) bankedSeconds = 0;

  const startedAt = typeof obj.startedAt === "string" ? obj.startedAt : null;
  const firstStartedAt = typeof obj.firstStartedAt === "string" ? obj.firstStartedAt : null;

  // Helper: safe parse ISO string to Date or null
  const parse = (s: string | null): Date | null => {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  const startedAtDate = parse(startedAt);
  const firstStartedAtDate = parse(firstStartedAt);
  const now = new Date();

  // Case: running but startedAt empty/unparseable
  if (status === "running" && !startedAtDate) {
    if (bankedSeconds > 0) {
      return { status: "paused", startedAt: null, firstStartedAt, bankedSeconds };
    }
    return IDLE_TIMER_STATE;
  }

  // Case: running, now < startedAt (clock moved back)
  if (status === "running" && startedAtDate && now < startedAtDate) {
    // Clamp elapsed to bankedSeconds; ask to confirm before continuing
    return {
      status: "running",
      startedAt: startedAtDate.toISOString(),
      firstStartedAt: firstStartedAtDate?.toISOString() ?? startedAtDate.toISOString(),
      bankedSeconds,
    };
  }

  // Case: paused but startedAt non-null -> ignore startedAt
  if (status === "paused" && startedAt) {
    return { status: "paused", startedAt: null, firstStartedAt, bankedSeconds };
  }

  // Case: idle but has data -> corrupted, log and clear
  if (status === "idle" && (bankedSeconds > 0 || startedAt || firstStartedAt)) {
    // In production, log for diagnostics here
    return IDLE_TIMER_STATE;
  }

  // Case: running valid but firstStartedAt empty -> best-effort fill
  let finalFirstStartedAt = firstStartedAt;
  if (status === "running" && startedAtDate && !firstStartedAtDate) {
    finalFirstStartedAt = startedAtDate.toISOString();
  }

  return {
    status,
    startedAt: status === "running" && startedAtDate ? startedAtDate.toISOString() : null,
    firstStartedAt: finalFirstStartedAt,
    bankedSeconds,
  };
}

// ---------------------------------------------------------------------------
// Elapsed time (pure)
// ---------------------------------------------------------------------------
export function elapsedSeconds(state: TimerState, now: Date = new Date()): number {
  if (state.status !== "running" || !state.startedAt) return state.bankedSeconds;

  const started = new Date(state.startedAt);
  if (isNaN(started.getTime())) return state.bankedSeconds;

  // Clock rollback: clamp to bankedSeconds
  if (now < started) return state.bankedSeconds;

  const active = Math.floor((now.getTime() - started.getTime()) / 1000);
  return state.bankedSeconds + active;
}

// ---------------------------------------------------------------------------
// Transition reducer (pure) — property: active time conserved across pause/resume
// firstStartedAt set once on idle->running, never moved by Pause/Resume/Stop
// ---------------------------------------------------------------------------
export type TimerAction =
  | { type: "START" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "STOP" };

export function reduceTimer(state: TimerState, action: TimerAction, now: Date = new Date()): TimerState {
  const isoNow = now.toISOString();

  switch (action.type) {
    case "START": {
      if (state.status !== "idle") return state; // no-op if not idle
      return {
        status: "running",
        startedAt: isoNow,
        firstStartedAt: isoNow,
        bankedSeconds: 0,
      };
    }
    case "PAUSE": {
      if (state.status !== "running" || !state.startedAt) return state;
      const started = new Date(state.startedAt);
      if (isNaN(started.getTime())) return state;
      const added = Math.floor((now.getTime() - started.getTime()) / 1000);
      return {
        status: "paused",
        startedAt: null,
        firstStartedAt: state.firstStartedAt,
        bankedSeconds: state.bankedSeconds + Math.max(0, added),
      };
    }
    case "RESUME": {
      if (state.status !== "paused") return state;
      return {
        status: "running",
        startedAt: isoNow,
        firstStartedAt: state.firstStartedAt,
        bankedSeconds: state.bankedSeconds,
      };
    }
    case "STOP": {
      if (state.status === "running" && state.startedAt) {
        const started = new Date(state.startedAt);
        if (!isNaN(started.getTime())) {
          const added = Math.floor((now.getTime() - started.getTime()) / 1000);
          return {
            status: "paused",
            startedAt: null,
            firstStartedAt: state.firstStartedAt,
            bankedSeconds: state.bankedSeconds + Math.max(0, added),
          };
        }
        // Fallback if startedAt unparseable
        return { ...state, status: "paused", startedAt: null };
      }
      if (state.status === "paused") {
        // Already paused, nothing to bank
        return state;
      }
      return state; // idle -> no-op
    }
  }
}

// ---------------------------------------------------------------------------
// Recovery classifier (§7) — evaluated on mount
// ---------------------------------------------------------------------------
export function classifyRecovery(state: TimerState, now: Date = new Date()): TimerRecoveryOutcome {
  if (state.status === "idle") return { kind: "idle" };
  if (state.status === "paused") return { kind: "paused", state };

  // state.status === "running"
  if (!state.startedAt) {
    // Should not happen after normalization, but be safe
    return { kind: "paused", state: { ...state, status: "paused", startedAt: null } };
  }

  const started = new Date(state.startedAt);
  if (isNaN(started.getTime())) {
    return { kind: "paused", state: { ...state, status: "paused", startedAt: null } };
  }

  // Clock rollback
  if (now < started) {
    return { kind: "clock-rollback", bankedSeconds: state.bankedSeconds, startedAt: started };
  }

  const elapsedSec = Math.floor((now.getTime() - started.getTime()) / 1000);

  // Less than 15 minutes -> seamless restore
  if (elapsedSec < 15 * 60) {
    return { kind: "running", state };
  }

  // 15 minutes or more -> Recovery Screen
  return { kind: "recovery-screen", state, elapsedSeconds: state.bankedSeconds + elapsedSec, startedAt: started };
}

// ---------------------------------------------------------------------------
// Timer -> Session conversion (§9–§10)
// Conversion happens exactly once at Save; ceil(bankedSeconds/60); zero disallowed
// ---------------------------------------------------------------------------
export type TimerSaveInput = {
  date: string;          // ISO day "YYYY-MM-DD" (defaults to firstStartedAt's day)
  durationMinutes: number; // user-editable, prefilled from ceil(bankedSeconds/60)
  note?: string;
};

export function timerToSession(
  state: TimerState,
  stopMoment: Date,
  input: TimerSaveInput,
): Omit<Session, "id" | "createdAt" | "updatedAt"> {
  const banked = state.bankedSeconds;
  if (banked <= 0) {
    throw new Error("Cannot create Session from timer with zero banked time");
  }

  // Rounding rule: ceil(bankedSeconds / 60) — but user may override
  const calculatedMinutes = Math.ceil(banked / 60);
  const durationMinutes = Math.max(1, input.durationMinutes); // enforced at UI level too

  const firstStartedAt = state.firstStartedAt ?? stopMoment.toISOString();
  const firstStartedDate = new Date(firstStartedAt);

  // Create payload only: id/createdAt/updatedAt are minted by
  // StoreContext.saveSession (ADR-003 single data-access point). Emitting an
  // id here would route saveSession down its update path and drop the record.
  return {
    date: input.date,
    startTime: firstStartedAt,
    endTime: stopMoment.toISOString(),
    durationMinutes,
    note: input.note,
    source: "timer",
  };
}

// ---------------------------------------------------------------------------
// Helper: calculate prefill minutes from bankedSeconds (ceil)
// ---------------------------------------------------------------------------
export function prefillMinutes(bankedSeconds: number): number {
  if (bankedSeconds <= 0) return 0;
  return Math.ceil(bankedSeconds / 60);
}

// ---------------------------------------------------------------------------
// Helper: format elapsed seconds as H:MM:SS for display
// ---------------------------------------------------------------------------
export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
