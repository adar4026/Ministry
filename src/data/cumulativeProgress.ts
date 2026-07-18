// Pure calculation helpers for the Home monthly pace-status label (TASK_015).
// No StoreContext, no React, no side effects — only math on precomputed
// values, same shape of contract as src/data/stats.ts.
//
// A cumulative-line-chart direction was prototyped and implemented here
// alongside these helpers, then rejected in favor of keeping the original
// horizontal progress bar — see docs/TASKS/TASK_015_HOME_MONTHLY_PACE_STATUS.md
// §"Rejected direction". Only the pace-deviation math (still used by the
// approved bar+status-label design) remains; the day-by-day cumulative
// series builder was removed with it (no remaining consumer).
//
// Current-month scope: legacyEntryBlockReason() (TASK_005B) already refuses
// legacy HourRecord entry for the current/future months, so hoursDoneToday
// (passed in from monthProgress().hoursDone) is always either Session-
// authoritative or 0 for the month this label describes.

// Ideal cumulative hours by day `day` of a `daysInMonth`-day month, assuming
// even daily pace toward `goalHours`. Safe for goalHours <= 0 or
// daysInMonth <= 0 (returns 0 rather than dividing by zero / producing NaN).
export function idealCumulativeHours(goalHours: number, daysInMonth: number, day: number): number {
  if (goalHours <= 0 || daysInMonth <= 0) return 0;
  const clampedDay = Math.max(0, Math.min(daysInMonth, day));
  return (goalHours * clampedDay) / daysInMonth;
}

export type PaceStatus = "ahead" | "behind" | "on";
export type PaceDeviation = { deviationHours: number; status: PaceStatus };

// Below this magnitude the deviation reads as "on pace" rather than a tiny
// ahead/behind figure — guards against floating-point noise, not a
// deliberate tolerance band (contrast with monthProgress()'s coarser
// half-day-pace tolerance used for the MonthChip/MonthlyStatsCard badge;
// this label always shows an exact H ч M м figure when off pace, so it
// needs a much tighter "effectively zero" threshold).
const ON_PACE_EPSILON_HOURS = 1 / 60;

// Deviation of `hoursDoneToday` (the month's real cumulative total — reuse
// monthProgress().hoursDone, never recomputed independently) from the ideal
// pace at `currentDay` of a `daysInMonth`-day month toward `goalHours`.
export function computePaceDeviation(
  hoursDoneToday: number,
  goalHours: number,
  daysInMonth: number,
  currentDay: number,
): PaceDeviation {
  const ideal = idealCumulativeHours(goalHours, daysInMonth, currentDay);
  const deviationHours = hoursDoneToday - ideal;
  const status: PaceStatus =
    Math.abs(deviationHours) < ON_PACE_EPSILON_HOURS ? "on" : deviationHours > 0 ? "ahead" : "behind";
  return { deviationHours, status };
}

// "H ч M м" for a non-negative hours duration, standard round-half-up on
// minutes (mirrors formatHMRounded()'s rounding in src/data/constants.ts,
// but this helper always shows minutes — even "0 м" — since it is always
// paired with an "Опережение"/"Отставание" label that reads oddly if the
// unit vanishes for a clean-hour deviation).
function formatDeviationHM(hours: number): string {
  const totalMinutes = Math.round(Math.max(0, hours) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h} ч ${m} м`;
}

// User-facing deviation label: "Опережение на X ч Y м" / "Отставание на
// X ч Y м" / a neutral on-pace message. Pure formatting — callers own color.
export function formatDeviationLabel(deviation: PaceDeviation): string {
  if (deviation.status === "on") return "Точно по плану";
  const hm = formatDeviationHM(Math.abs(deviation.deviationHours));
  return deviation.status === "ahead" ? `Опережение на ${hm}` : `Отставание на ${hm}`;
}
