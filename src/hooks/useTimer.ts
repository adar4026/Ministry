import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useStore } from "@/store/StoreContext";
import {
  normalizeTimerState,
  reduceTimer,
  classifyRecovery,
  elapsedSeconds,
  timerToSession,
  prefillMinutes,
  type TimerState,
  type TimerAction,
  type TimerRecoveryOutcome,
  IDLE_TIMER_STATE,
} from "@/data/timer";

const TIMER_KEY = "mj_timer_v1";

type TimerMode = "idle" | "running" | "paused" | "recovery-screen" | "clock-rollback";

export type TimerHook = {
  // State
  state: TimerState;
  mode: TimerMode;
  elapsedSec: number;
  prefillMin: number;
  loaded: boolean;

  // Recovery info (when mode === "recovery-screen" or "clock-rollback")
  recoveryElapsedSec?: number;
  recoveryStartedAt?: Date;

  // Actions
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  save: (input: { date: string; durationMinutes: number; note?: string }) => void;
  discard: () => void;
  continue: () => void; // Close recovery screen, user may resume
  confirmClockRollback: () => void; // User confirmed clock rollback, continue running
};

/**
 * Timer control state hook (TASK_005C).
 * Owns mj_timer_v1 lifecycle: read -> normalize -> transition -> persist.
 * Screen-scoped (not a provider); global indicator is TASK_005D.
 * Session creation goes through StoreContext.saveSession() (ADR-003).
 */
export function useTimer(): TimerHook {
  const { saveSession } = useStore();
  const [state, setState] = useState<TimerState>(IDLE_TIMER_STATE);
  const [mode, setMode] = useState<TimerMode>("idle");
  const [recoveryElapsedSec, setRecoveryElapsedSec] = useState<number | undefined>(undefined);
  const [recoveryStartedAt, setRecoveryStartedAt] = useState<Date | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  // Hydrate from AsyncStorage on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(TIMER_KEY);
        if (active) {
          const normalized = normalizeTimerState(raw ? JSON.parse(raw) : null);
          setState(normalized);
          // Classify recovery
          const recovery = classifyRecovery(normalized);
          if (recovery.kind === "idle") {
            setMode("idle");
          } else if (recovery.kind === "paused") {
            setMode("paused");
          } else if (recovery.kind === "running") {
            setMode("running");
          } else if (recovery.kind === "recovery-screen") {
            setMode("recovery-screen");
            setRecoveryElapsedSec(recovery.elapsedSeconds);
            setRecoveryStartedAt(recovery.startedAt);
          } else if (recovery.kind === "clock-rollback") {
            setMode("clock-rollback");
            setRecoveryElapsedSec(recovery.bankedSeconds);
            setRecoveryStartedAt(recovery.startedAt);
          }
          setLoaded(true);
        }
      } catch {
        // Corrupt/unavailable storage -> idle (normalize already handles this)
        if (active) {
          setState(IDLE_TIMER_STATE);
          setMode("idle");
          setLoaded(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Persist on state change (after hydration)
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(TIMER_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, loaded]);

  // Live elapsed seconds for running mode (cosmetic tick)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (mode !== "running") return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [mode]);

  // Compute elapsed seconds for display (running mode includes live tick)
  const elapsedSec = mode === "running" ? elapsedSeconds(state, new Date(Date.now() + tick * 1000)) : elapsedSeconds(state);
  const prefillMin = prefillMinutes(state.bankedSeconds);

  // Transition helper
  const transition = useCallback((action: TimerAction) => {
    setState((s) => reduceTimer(s, action, new Date()));
  }, []);

  // Actions
  const start = useCallback(() => {
    if (state.status === "idle") {
      transition({ type: "START" });
      setMode("running");
      setRecoveryElapsedSec(undefined);
      setRecoveryStartedAt(undefined);
    }
  }, [state.status, transition]);

  const pause = useCallback(() => {
    if (state.status === "running") {
      transition({ type: "PAUSE" });
      setMode("paused");
    }
  }, [state.status, transition]);

  const resume = useCallback(() => {
    if (state.status === "paused") {
      transition({ type: "RESUME" });
      setMode("running");
    }
  }, [state.status, transition]);

  const stop = useCallback(() => {
    if (state.status === "running" || state.status === "paused") {
      transition({ type: "STOP" });
      setMode("paused");
    }
  }, [state.status, transition]);

  const save = useCallback(
    (input: { date: string; durationMinutes: number; note?: string }) => {
      if (state.bankedSeconds <= 0) return; // UI disables Save at 0
      const session = timerToSession(state, new Date(), input);
      saveSession(session);
      // Reset timer to idle after successful save
      setState(IDLE_TIMER_STATE);
      setMode("idle");
    },
    [state.bankedSeconds, saveSession],
  );

  const discard = useCallback(() => {
    setState(IDLE_TIMER_STATE);
    setMode("idle");
    setRecoveryElapsedSec(undefined);
    setRecoveryStartedAt(undefined);
  }, []);

  const continueTimer = useCallback(() => {
    // Close recovery screen; mode returns based on persisted state
    const recovery = classifyRecovery(state);
    if (recovery.kind === "running") {
      setMode("running");
    } else if (recovery.kind === "paused") {
      setMode("paused");
    } else {
      setMode("idle");
    }
    setRecoveryElapsedSec(undefined);
    setRecoveryStartedAt(undefined);
  }, [state]);

  const confirmClockRollback = useCallback(() => {
    // User confirmed clock rollback -> continue running
    setMode("running");
    setRecoveryElapsedSec(undefined);
    setRecoveryStartedAt(undefined);
  }, []);

  return {
    state,
    mode,
    elapsedSec,
    prefillMin,
    loaded,
    recoveryElapsedSec,
    recoveryStartedAt,
    start,
    pause,
    resume,
    stop,
    save,
    discard,
    continue: continueTimer,
    confirmClockRollback,
  };
}
