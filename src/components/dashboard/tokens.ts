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
  // Base under the Home gradient overlay (TASK_010; darkened in TASK_017 for
  // stronger contrast against white cards) — matches HOME_GRADIENT's final
  // stop so the flat area below the gradient blends in.
  homeBase: "#eef2f0",
  teal: "#2fb3c9",
  tealInk: "#0d7488",
  green: "#34c759",
  greenInk: "#1f9e4a",
  amber: "#ff8a1e",
  amberInk: "#c2610a",
  // TASK_027: warm amber accent for the "time remaining"/"time elapsed"
  // label on event cards — deliberately not `amber`/`amberInk` above (those
  // belong to the goal ring's semantics/value). Chosen over red so a
  // deadline reads as informational, not as an error/overdue state.
  durationAccent: "#D97706",
  shadow: "#3c5090",
  onAccent: "#ffffff",
  // TASK_015: semantic "behind pace" color for the Home monthly card's
  // pace-status label — mirrors COLORS.danger (src/data/constants.ts)
  // exactly, kept as its own DS token rather than importing the global
  // palette into Home-scoped tokens.
  danger: "#dc2626",
  // TASK_048 — WCAG-AA (>= 4.5:1 on DS.cardBg) variants of the three
  // semantic text roles Home uses for small (12-15px) labels. Deliberately
  // ADDED rather than changing `subText`/`metaText`/`greenInk`/`amberInk`
  // above: those tokens are also consumed by Profile, Timeline and the
  // /upcoming-events header, which are outside this task's scope.
  //   subInk     #5f7290 -> 4.89:1 (subText was 3.61:1, metaText 3.03:1)
  //   successInk #15803d -> 5.01:1 (greenInk was 3.47:1)
  //   warnInk    #b45309 -> 5.02:1 (amberInk was 4.00:1, durationAccent 3.18:1)
  // `danger` (4.83:1) and `tealInk` (5.43:1) already pass and are reused
  // as-is for the error / soft-accent roles.
  subInk: "#5f7290",
  successInk: "#15803d",
  warnInk: "#b45309",
  // Darker end of the app's own accent-blue family (it is ACCENT_RING_STOPS'
  // last stop). `accent` (#3f6fe0) and COLORS.accent (#3b82f6) measure
  // 3.9-4.1:1 as label text on the tinted surfaces Home puts them on
  // (heroBg, COLORS.light, homeBase); this passes at 5.6-5.7:1 without
  // leaving the brand hue.
  accentInk: "#2d55c7",
  // Secondary text sitting on the Home gradient rather than on a white card.
  // `subInk` above is tuned for white (4.89:1) and drops to 3.6:1 against the
  // gradient's darker top stop, so on-tint captions get their own value.
  onTintInk: "#46566e",
} as const;

// Gradient stops for the goal ring (blue -> green -> amber).
export const RING_STOPS = ["#4a7dff", "#34c759", "#ffb02e"] as const;

// Home's ring (TASK_010): a single Ministry accent hue, not the multicolor
// ring above — a restrained gradient within the same blue family.
export const ACCENT_RING_STOPS = ["#8fadf7", DS.accent, "#2d55c7"] as const;

// Home-only background gradient (TASK_010; darkened in TASK_017 for a
// unified high-contrast card system — same sage/gray-turquoise hue, lower
// lightness so white cards read as clearly brighter surfaces). Deliberately
// not Apple's exact green. Local to the Home screen — does not affect global
// COLORS or other screens.
export const HOME_GRADIENT = ["#cfe3d9", "#e3ece8", "#eef2f0"] as const;
