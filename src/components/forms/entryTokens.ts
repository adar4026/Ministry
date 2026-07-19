// Local design tokens for the "Добавить время" screen (TASK_030) — scoped
// here rather than added to the global `COLORS` in src/data/constants.ts,
// same pattern as src/components/dashboard/tokens.ts for the Home screen,
// so this redesign doesn't ripple into other screens/forms that still use
// COLORS.bg / COLORS.groupedBg.
export const ADD_TIME_COLORS = {
  screenBackground: "#EBEBEF",
  cardBackground: "#FFFFFF",
  selectedPickerRow: "#E8E8EA",
  datePillBackground: "#E3E3E5",
  primaryText: "#000000",
  secondaryText: "#6E6E73",
};
