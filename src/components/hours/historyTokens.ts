import { Platform } from "react-native";

// System-font stack matching the reference iOS screenshots (San Francisco).
// Native: no explicit fontFamily — RN already resolves to San Francisco on
// iOS by default (verified for the rest of the app, TASK_023), so leaving
// this undefined is the correct "use the system font" value, not an
// oversight. Web: react-native-web needs an explicit stack to get the same
// result, since its default is a generic sans-serif, not the OS font.
export const HISTORY_FONT_FAMILY: string | undefined =
  Platform.OS === "web"
    ? '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif'
    : undefined;

// Local design tokens for the redesigned "История" screen (TASK_032) —
// same pattern as entryTokens.ts (TASK_030) / hoursTokens.ts (TASK_031):
// a small screen-scoped token file rather than growing the shared
// src/data/constants.ts COLORS. The reference screenshots use a purple/
// lavender accent family distinct from HOURS_COLORS.accent (blue, TASK_031)
// for "day with logged time" / "today" — introduced here rather than
// repurposing the blue accent, since the two screens are visually
// independent redesigns that happen to share the same module.
export const HISTORY_COLORS = {
  screenBackground: "#EBEBEF",
  cardBackground: "#FFFFFF",
  primaryText: "#000000",
  secondaryText: "#6E6E73",
  mutedText: "#AEAEB2",
  divider: "#E5E5EA",
  emptyCellBorder: "#D1D1D6",
  filledDayBg: "#EDE9FE",
  todayAccent: "#5B21B6",
  iconBg: "#F2F2F7",
};
