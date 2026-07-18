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
  // Near-white base under the Home gradient overlay (TASK_010) — matches
  // HOME_GRADIENT's final stop so the flat area below the gradient blends in.
  homeBase: "#fbfdfc",
  teal: "#2fb3c9",
  tealInk: "#0d7488",
  green: "#34c759",
  greenInk: "#1f9e4a",
  amber: "#ff8a1e",
  amberInk: "#c2610a",
  shadow: "#3c5090",
  onAccent: "#ffffff",
  // TASK_015: semantic "behind pace" color for the Home monthly card's
  // pace-status label — mirrors COLORS.danger (src/data/constants.ts)
  // exactly, kept as its own DS token rather than importing the global
  // palette into Home-scoped tokens.
  danger: "#dc2626",
} as const;

// Gradient stops for the goal ring (blue -> green -> amber).
export const RING_STOPS = ["#4a7dff", "#34c759", "#ffb02e"] as const;

// Home's ring (TASK_010): a single Ministry accent hue, not the multicolor
// ring above — a restrained gradient within the same blue family.
export const ACCENT_RING_STOPS = ["#8fadf7", DS.accent, "#2d55c7"] as const;

// Home-only background gradient (TASK_010): muted sage/gray-turquoise,
// fading to near-white. Deliberately not Apple's exact green. Local to the
// Home screen — does not affect global COLORS or other screens.
export const HOME_GRADIENT = ["#dbe9e2", "#eef4f1", "#fbfdfc"] as const;
