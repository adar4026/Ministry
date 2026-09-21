// Local design tokens for the "Добавить время" screen (TASK_030) — scoped
// here rather than added to the global `COLORS` in src/data/constants.ts,
// same pattern as src/components/dashboard/tokens.ts for the Home screen,
// so this redesign doesn't ripple into other screens/forms that still use
// COLORS.bg / COLORS.groupedBg.
// TASK_078 — live light/dark pair (src/theme/scheme.ts).
import { live } from "@/theme/scheme";

export const ADD_TIME_COLORS_LIGHT = {
  screenBackground: "#EBEBEF",
  cardBackground: "#FFFFFF",
  selectedPickerRow: "#E8E8EA",
  datePillBackground: "#E3E3E5",
  primaryText: "#000000",
  secondaryText: "#6E6E73",
};
export const ADD_TIME_COLORS_DARK: typeof ADD_TIME_COLORS_LIGHT = {
  screenBackground: "#0f1115",
  cardBackground: "#1c2029",
  selectedPickerRow: "#262c38",
  datePillBackground: "#2a3040",
  primaryText: "#f2f4f8",
  secondaryText: "#9aa1ae",
};
export const ADD_TIME_COLORS = live(ADD_TIME_COLORS_LIGHT, ADD_TIME_COLORS_DARK);
