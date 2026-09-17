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
  // TASK_049 — "Сегодня" on the "Ближайшие события" urgency scale.
  // Deliberately distinct from `warnInk` (amber, used for "Завтра" / 2-7
  // days): the scale has 5 visually different tiers, and reusing warnInk for
  // both today and the next week would collapse two of them into one color.
  // Tailwind orange-700 -> 5.17:1 on DS.cardBg.
  todayInk: "#c2410c",
  // TASK_053 — flat base under the Home screen's OWN mint gradient
  // (HOME_MINT_GRADIENT below), matching its final stop so the area past
  // the fixed-height <HomeBackground> blends in seamlessly. Deliberately a
  // new token rather than repurposing `homeBase`: that one is shared by
  // Hours/Timeline/Profile/upcoming-events (all reuse <HomeBackground /> with
  // its default HOME_GRADIENT), which this task must not touch.
  homeMintBase: "#F7FAF9",
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

// TASK_053 — Home screen's own vertical gradient: calm light mint-blue,
// per the owner's exact spec (180deg, #DCEFE9 0% / #EDF6F3 42% / #F7FAF9
// 100%). Kept as a SEPARATE constant from HOME_GRADIENT above rather than
// changing its values in place: HOME_GRADIENT (and DS.homeBase) are also
// consumed, via the same <HomeBackground /> component, by Hours, Timeline,
// Profile and /upcoming-events — this task's scope is Home only.
export const HOME_MINT_GRADIENT = ["#DCEFE9", "#EDF6F3", "#F7FAF9"] as const;
// Stop offsets (0-1) matching the spec's 0% / 42% / 100%, passed alongside
// HOME_MINT_GRADIENT to <HomeBackground> — the default offsets ([0, 0.55, 1]
// in HomeBackground.tsx) stay the ones the other four screens get.
export const HOME_MINT_GRADIENT_STOPS = [0, 0.42, 1] as const;

// ---------------------------------------------------------------------------
// TASK_065 — Ministry's own identity palette for the Home hero.
//
// Chosen AFTER measuring the sibling apps' real tokens: Alex Finance is
// violet/lavender (--accent #6d5df6, hue ~248°), Lexcar is cyan / ice-blue
// (--accent #0e7c86, c1 #0d949f, c2 #78c4f0 — hue 185–202°). Ministry sits
// on the GREEN side of teal (hue 155–168°): emerald + mint with a deep pine
// teal in the shadows instead of Lexcar's deep blue. No value below equals a
// Finance or Lexcar token; the closest foreign one (Lexcar c1) is ~20° away
// and visibly bluer.
//
// This object is the single source of truth. On web the same values are
// published as CSS custom properties (`--ministry-*`, see ministryCssVars()
// and app/+html.tsx) so the WebGL hero reads them via getComputedStyle —
// the same mechanism Finance uses for its --hero-gl-* tokens. Nothing is
// hardcoded twice.
export const MINISTRY = {
  primary: "#0f6f5c",       // deep teal — buttons, accent ink
  accent: "#1fa683",        // soft emerald — progress fill, icons
  accentSoft: "#e2f4ed",    // pill backgrounds
  heroTop: "#c6ebde",       // top of the scene — light mint
  heroA: "#189a79",         // dominant wave — emerald-teal
  heroB: "#8ddcc4",         // second wave — soft aqua-mint
  heroC: "#e8f9f2",         // highlight — pale mint (deliberately not white)
  heroDeep: "#0a5748",      // fold shadow / valley — pine teal
  bg: "#f4f9f7",            // page ground == bottom of the hero
  surface: "#ffffff",
  ink: "#0f2a26",           // hero headlines: >= 6.8:1 on every wave color
  ink2: "#274640",          // hero secondary text: 4.65:1 even on a fully saturated wave-a crest
  // Opacity of waves a/b/c and the specular sheen strength (shader uniforms).
  heroAlpha: [0.56, 0.48, 0.40] as const,
  heroLight: 0.62,
} as const;

// `:root{--ministry-*}` for app/+html.tsx. Kebab-case keys, numbers joined
// with spaces (the shader parses "a b c" back into a vec3).
export function ministryCssVars(): string {
  const entries: string[] = [];
  for (const [key, value] of Object.entries(MINISTRY)) {
    const name = `--ministry-${key.replace(/([A-Z0-9])/g, "-$1").toLowerCase()}`;
    entries.push(`${name}:${Array.isArray(value) ? value.join(" ") : String(value)}`);
  }
  return `:root{${entries.join(";")}}`;
}
