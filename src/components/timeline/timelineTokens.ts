// Local design tokens for the redesigned "События" screen (TASK_041) — same
// pattern as hoursTokens.ts/historyTokens.ts: a small screen-scoped token
// file rather than growing the shared COLORS. The screen's own background is
// NOT here — owner decided to reuse Home's actual background mechanism
// (DS.homeBase + <HomeBackground />, src/components/dashboard/) verbatim
// rather than introduce a page-local background color, so timeline.tsx
// imports those directly instead of duplicating a similar-looking value.
// TASK_078 — live light/dark pair (src/theme/scheme.ts).
import { live } from "@/theme/scheme";

export const TIMELINE_COLORS_LIGHT = {
  cardBackground: "#FFFFFF",
  primaryText: "#000000",
  secondaryText: "#6E6E73",
  // TASK_041 owner requirement: topic filter labels render in blue.
  topicText: "#3b82f6",
  durationAccent: "#D97706",
  danger: "#dc2626",
  onDanger: "#ffffff",
};
export const TIMELINE_COLORS_DARK: typeof TIMELINE_COLORS_LIGHT = {
  cardBackground: "#1c2029",
  primaryText: "#f2f4f8",
  secondaryText: "#9aa1ae",
  topicText: "#5b8bff",
  durationAccent: "#fbbf24",
  danger: "#f87171",
  onDanger: "#ffffff",
};
export const TIMELINE_COLORS = live(TIMELINE_COLORS_LIGHT, TIMELINE_COLORS_DARK);
