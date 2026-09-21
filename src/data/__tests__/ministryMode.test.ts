// TASK_073 — pure settings helpers: the safe fallback for an installation
// that predates settings, and goal parsing.
import { MONTHLY_GOAL } from "@/data/constants";
import {
  DEFAULT_MINISTRY_SETTINGS,
  effectiveMonthlyGoal,
  hoursTabTitle,
  isHoursMode,
  nextThemePreference,
  normalizeMinistrySettings,
  parseMonthlyGoalInput,
  settingsEqual,
  yearlyGoalFor,
} from "@/data/ministryMode";

describe("normalizeMinistrySettings — existing-user fallback", () => {
  it("defaults to pioneer with the historical fixed goal", () => {
    expect(DEFAULT_MINISTRY_SETTINGS).toEqual({ ministryMode: "pioneer", monthlyHourGoal: MONTHLY_GOAL, theme: "system" });
    expect(MONTHLY_GOAL).toBe(50);
  });

  it.each([undefined, null, 42, "x", {}, []])("coerces %p to the defaults", (raw) => {
    expect(normalizeMinistrySettings(raw)).toEqual(DEFAULT_MINISTRY_SETTINGS);
  });

  it("keeps a valid stored value untouched", () => {
    expect(normalizeMinistrySettings({ ministryMode: "publisher", monthlyHourGoal: 30, theme: "dark" })).toEqual({
      ministryMode: "publisher",
      monthlyHourGoal: 30,
      theme: "dark",
    });
    expect(normalizeMinistrySettings({ ministryMode: "specialPioneer", monthlyHourGoal: null, theme: "light" })).toEqual({
      ministryMode: "specialPioneer",
      monthlyHourGoal: null,
      theme: "light",
    });
  });

  it("falls back per field: unknown mode → pioneer, missing goal → 50, bad goal → 50", () => {
    expect(normalizeMinistrySettings({ ministryMode: "elder", monthlyHourGoal: 70 })).toEqual({ ministryMode: "pioneer", monthlyHourGoal: 70, theme: "system" });
    // TASK_078 — theme: missing / unknown → "system"; a valid one is kept.
    expect(normalizeMinistrySettings({ ministryMode: "pioneer", monthlyHourGoal: 50, theme: "sepia" })).toEqual({ ministryMode: "pioneer", monthlyHourGoal: 50, theme: "system" });
    expect(normalizeMinistrySettings({ ministryMode: "pioneer", monthlyHourGoal: 50, theme: "dark" }).theme).toBe("dark");
    expect(normalizeMinistrySettings({ ministryMode: "publisher" })).toEqual({ ministryMode: "publisher", monthlyHourGoal: 50, theme: "system" });
    expect(normalizeMinistrySettings({ ministryMode: "pioneer", monthlyHourGoal: -5 })).toEqual({ ministryMode: "pioneer", monthlyHourGoal: 50, theme: "system" });
    expect(normalizeMinistrySettings({ ministryMode: "pioneer", monthlyHourGoal: 12.5 })).toEqual({ ministryMode: "pioneer", monthlyHourGoal: 50, theme: "system" });
    expect(normalizeMinistrySettings({ ministryMode: "pioneer", monthlyHourGoal: "50" })).toEqual({ ministryMode: "pioneer", monthlyHourGoal: 50, theme: "system" });
  });
});

describe("theme helpers (TASK_078)", () => {
  it("cycles light → dark → system → light, like Finance's toggleTheme()", () => {
    expect(nextThemePreference("light")).toBe("dark");
    expect(nextThemePreference("dark")).toBe("system");
    expect(nextThemePreference("system")).toBe("light");
  });
  it("settingsEqual compares the theme too", () => {
    const a = { ministryMode: "pioneer" as const, monthlyHourGoal: 50, theme: "light" as const };
    expect(settingsEqual(a, { ...a, theme: "dark" })).toBe(false);
    expect(settingsEqual(a, { ...a })).toBe(true);
  });
});

describe("mode / goal helpers", () => {
  it("pioneer and specialPioneer share the hours machinery; publisher does not", () => {
    expect(isHoursMode("pioneer")).toBe(true);
    expect(isHoursMode("specialPioneer")).toBe(true);
    expect(isHoursMode("publisher")).toBe(false);
  });

  it("the hours tab is «Часы» for pioneers and «Служение» for a publisher", () => {
    expect(hoursTabTitle("pioneer")).toBe("Часы");
    expect(hoursTabTitle("specialPioneer")).toBe("Часы");
    expect(hoursTabTitle("publisher")).toBe("Служение");
  });

  it("effective goal is 0 for null; yearly goal is 12× monthly (50 → 600)", () => {
    expect(effectiveMonthlyGoal({ ministryMode: "pioneer", monthlyHourGoal: null, theme: "system" })).toBe(0);
    expect(effectiveMonthlyGoal({ ministryMode: "pioneer", monthlyHourGoal: 70, theme: "system" })).toBe(70);
    expect(yearlyGoalFor(50)).toBe(600);
  });

  it("parses the goal field: empty → null, digits → number, junk/out-of-range → undefined", () => {
    expect(parseMonthlyGoalInput("")).toBeNull();
    expect(parseMonthlyGoalInput("  ")).toBeNull();
    expect(parseMonthlyGoalInput("50")).toBe(50);
    expect(parseMonthlyGoalInput(" 600 ")).toBe(600);
    expect(parseMonthlyGoalInput("0")).toBeUndefined();
    expect(parseMonthlyGoalInput("12.5")).toBeUndefined();
    expect(parseMonthlyGoalInput("abc")).toBeUndefined();
    expect(parseMonthlyGoalInput("10000")).toBeUndefined();
  });
});
