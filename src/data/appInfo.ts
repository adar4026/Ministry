// TASK_066 — the single source for "what version is this app" and where it
// is shown. Before this task the literal "0.4.4" lived twice: in
// app/(tabs)/profile.tsx (the "Версия приложения" row) and in
// src/data/backup.ts (the `appVersion` written into every backup file).
// Both now read from here; src/data/backup.ts re-exports APP_VERSION so its
// own public contract is unchanged. Must match package.json "version" — a
// test guards that. Bumping is a release step, never part of a feature task.

export const APP_VERSION = "0.4.4";

// Display name used in the drawer footer ("A-Lex Ministry · v0.4.4") — with
// a hyphen, matching the sibling apps' branding (A-Lex Finance).
export const APP_DISPLAY_NAME = "A-Lex Ministry";

// "YYYY-MM" of the last release-worthy change, shown as "Обновлено: месяц
// год" in the drawer footer. Set alongside APP_VERSION at release time.
export const APP_UPDATED = "2026-09";

const MONTHS_NOM_LOWER = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

// "2026-09" -> "сентябрь 2026". Malformed input is returned unchanged rather
// than throwing — the footer is decoration, not a place to crash.
export function formatUpdatedLabel(yyyyMm: string = APP_UPDATED): string {
  const m = /^(\d{4})-(\d{2})$/.exec(yyyyMm);
  if (!m) return yyyyMm;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return yyyyMm;
  return `${MONTHS_NOM_LOWER[month - 1]} ${m[1]}`;
}
