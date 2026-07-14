// Dashboard design tokens (TASK_007).
//
// The Home screen is the reference implementation for the future Design
// System. These tokens are intentionally LOCAL to the dashboard component
// library and separate from the global `COLORS` in src/data/constants.ts,
// which must not change (palette scope is Home-only). Future dashboard
// screens should consume these instead of hardcoding hex values.
export const DS = {
  navy: "#16294d",
  accent: "#3f6fe0",
  cardBg: "#ffffff",
  heroBg: "#e8eefb",
  subText: "#7488a6",
  metaText: "#8a97ac",
  chevron: "#c3c3c9",
  segOn: "#3f6fe0",
  segOff: "#dfe3ee",
  ringTrack: "#e7e9ef",
  divider: "rgba(22,41,77,0.10)",
  teal: "#2fb3c9",
  tealInk: "#0d7488",
  green: "#34c759",
  greenInk: "#1f9e4a",
  amber: "#ff8a1e",
  amberInk: "#c2610a",
  shadow: "#3c5090",
  onAccent: "#ffffff",
} as const;

// Gradient stops for the goal ring (blue -> green -> amber).
export const RING_STOPS = ["#4a7dff", "#34c759", "#ffb02e"] as const;
