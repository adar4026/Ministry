// TASK_073 — pure helpers for the ministry mode / settings model. No React,
// no storage: StoreContext applies these, screens read the results.
import { MONTHLY_GOAL } from "./constants";
import type { MinistryMode, MinistrySettings, ThemePreference } from "@/types";

export const MINISTRY_MODES: readonly MinistryMode[] = ["publisher", "pioneer", "specialPioneer"];

// The safe fallback for an installation that predates settings: the app was
// hours-only with a fixed 50-hour goal, so an existing user must come back
// exactly as a pioneer with that goal — nothing on screen may change until
// they pick another mode themselves.
export const DEFAULT_MINISTRY_SETTINGS: MinistrySettings = {
  ministryMode: "pioneer",
  monthlyHourGoal: MONTHLY_GOAL,
  theme: "system",
};

// TASK_078 — the theme cycle of Finance's toggleTheme(): light → dark →
// system → light. `THEME_LABEL` is the a11y / settings wording.
export const THEME_PREFERENCES: readonly ThemePreference[] = ["light", "dark", "system"];
export const THEME_LABEL: Record<ThemePreference, string> = {
  light: "Светлая тема",
  dark: "Тёмная тема",
  system: "Системная тема",
};
export const THEME_DESCRIPTION: Record<ThemePreference, string> = {
  light: "Всегда светлое оформление",
  dark: "Всегда тёмное оформление",
  system: "Как на устройстве — следует настройке iOS",
};
export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (THEME_PREFERENCES as readonly string[]).includes(value);
}
export function nextThemePreference(current: ThemePreference): ThemePreference {
  return THEME_PREFERENCES[(THEME_PREFERENCES.indexOf(current) + 1) % THEME_PREFERENCES.length];
}

export const MODE_LABEL: Record<MinistryMode, string> = {
  publisher: "Возвещатель",
  pioneer: "Пионер",
  specialPioneer: "Специальный пионер",
};

export const MODE_DESCRIPTION: Record<MinistryMode, string> = {
  publisher: "Отметки дней участия в служении, без учёта часов",
  pioneer: "Учёт часов и месячная цель",
  specialPioneer: "Учёт часов и собственная месячная цель",
};

// Bounds for a user-entered monthly goal (whole hours). Wide on purpose —
// the value is the user's own target, not a norm the app knows better.
export const MIN_MONTHLY_GOAL = 1;
export const MAX_MONTHLY_GOAL = 9999;

export function isMinistryMode(value: unknown): value is MinistryMode {
  return typeof value === "string" && (MINISTRY_MODES as readonly string[]).includes(value);
}

/** Whether the mode uses the hours machinery (goal, progress, timer). */
export function isHoursMode(mode: MinistryMode): boolean {
  return mode === "pioneer" || mode === "specialPioneer";
}

/** Label of the `hours` tab: the route is the same, only its name follows the mode. */
export function hoursTabTitle(mode: MinistryMode): string {
  return isHoursMode(mode) ? "Часы" : "Служение";
}

/** A valid stored goal: a finite whole number within bounds, or null. */
export function isValidMonthlyGoal(value: unknown): value is number | null {
  if (value === null) return true;
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_MONTHLY_GOAL && value <= MAX_MONTHLY_GOAL;
}

/**
 * Coerces whatever is in storage into a complete MinistrySettings. Missing or
 * unknown `ministryMode` → "pioneer"; a missing goal → the historical fixed
 * goal (50); an out-of-range/non-integer goal → also 50 (never null, so a
 * corrupt value cannot silently remove the goal). Never throws.
 */
export function normalizeMinistrySettings(raw: unknown): MinistrySettings {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const ministryMode = isMinistryMode(obj.ministryMode) ? obj.ministryMode : DEFAULT_MINISTRY_SETTINGS.ministryMode;
  const goal = obj.monthlyHourGoal;
  const monthlyHourGoal =
    goal === undefined ? DEFAULT_MINISTRY_SETTINGS.monthlyHourGoal : isValidMonthlyGoal(goal) ? goal : DEFAULT_MINISTRY_SETTINGS.monthlyHourGoal;
  const theme = isThemePreference(obj.theme) ? obj.theme : DEFAULT_MINISTRY_SETTINGS.theme;
  return { ministryMode, monthlyHourGoal, theme };
}

export function settingsEqual(a: MinistrySettings, b: MinistrySettings): boolean {
  return a.ministryMode === b.ministryMode && a.monthlyHourGoal === b.monthlyHourGoal && a.theme === b.theme;
}

/** The monthly goal as the hours screens consume it: 0 means "no goal". */
export function effectiveMonthlyGoal(settings: MinistrySettings): number {
  return settings.monthlyHourGoal ?? 0;
}

/** Service-year goal derived from the monthly one (50 → 600, as before). */
export function yearlyGoalFor(monthlyGoal: number): number {
  return monthlyGoal * 12;
}

/**
 * Parses the settings screen's text field. Empty/whitespace → null (no
 * goal); otherwise a whole number in range, or `undefined` for invalid input
 * (so the caller can keep the previous value and show a hint).
 */
export function parseMonthlyGoalInput(text: string): number | null | undefined {
  const t = text.trim();
  if (t === "") return null;
  if (!/^\d+$/.test(t)) return undefined;
  const n = Number(t);
  return isValidMonthlyGoal(n) ? n : undefined;
}
