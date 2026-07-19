// Local design tokens for the redesigned "Часы" screen (TASK_031) —
// scoped here rather than added to the global `COLORS` in
// src/data/constants.ts, same pattern as src/components/dashboard/tokens.ts
// and src/components/forms/entryTokens.ts. Values match ADD_TIME_COLORS
// (the "Добавить время" screen, TASK_030) deliberately — the owner asked
// for visual consistency with that already-redesigned screen — but this
// stays its own file so the two screens' tokens don't couple to each other.
export const HOURS_COLORS = {
  screenBackground: "#EBEBEF",
  cardBackground: "#FFFFFF",
  primaryText: "#000000",
  secondaryText: "#6E6E73",
  tertiaryText: "#AEAEB2",
  divider: "#E5E5EA",
  accent: "#3b82f6",
  danger: "#dc2626",
  iconBg: "#EFF4FF",
};
