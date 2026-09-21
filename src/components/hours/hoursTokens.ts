// Local design tokens for the redesigned "Часы" screen (TASK_031) —
// scoped here rather than added to the global `COLORS` in
// src/data/constants.ts, same pattern as src/components/dashboard/tokens.ts
// and src/components/forms/entryTokens.ts. Values match ADD_TIME_COLORS
// (the "Добавить время" screen, TASK_030) deliberately — the owner asked
// for visual consistency with that already-redesigned screen — but this
// stays its own file so the two screens' tokens don't couple to each other.
// TASK_078 — live light/dark pair (src/theme/scheme.ts); dark follows the
// iOS grouped dark look the light set mirrors (black ground, #1c1c1e cards).
import { live } from "@/theme/scheme";

export const HOURS_COLORS_LIGHT = {
  screenBackground: "#EBEBEF",
  cardBackground: "#FFFFFF",
  primaryText: "#000000",
  secondaryText: "#6E6E73",
  tertiaryText: "#AEAEB2",
  divider: "#E5E5EA",
  accent: "#3b82f6",
  danger: "#dc2626",
  iconBg: "#EFF4FF",
  // TASK_078 — were literals in HoursNavList / TimerHeroCard.
  pressed: "#F7F7F9",
  secondaryButton: "#F2F2F7",
  dangerButtonBg: "#FDECEC",
};
export const HOURS_COLORS_DARK: typeof HOURS_COLORS_LIGHT = {
  screenBackground: "#0f1115",
  cardBackground: "#1c2029",
  primaryText: "#f2f4f8",
  secondaryText: "#9aa1ae",
  tertiaryText: "#6b7280",
  divider: "rgba(255,255,255,0.10)",
  accent: "#5b8bff",
  danger: "#f87171",
  iconBg: "#232c3f",
  pressed: "#232834",
  secondaryButton: "#262c38",
  dangerButtonBg: "#3b1f22",
};
export const HOURS_COLORS = live(HOURS_COLORS_LIGHT, HOURS_COLORS_DARK);
