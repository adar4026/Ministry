// Dashboard design tokens (TASK_007).
//
// The Home screen is the reference implementation for the future Design
// System. These tokens are intentionally LOCAL to the dashboard component
// library and separate from the global `COLORS` in src/data/constants.ts,
// which must not change (palette scope is Home-only). Future dashboard
// screens should consume these instead of hardcoding hex values.
//
// TASK_078 — every cluster here is a LIVE pair: `X = live(X_LIGHT, X_DARK)`
// (src/theme/scheme.ts). Reading `DS.navy` gives the value for the colour
// scheme the ThemeProvider currently has active; the `_LIGHT` objects are
// the untouched pre-TASK_078 values (and what every test that does not
// switch schemes still sees). Dark sets are NOT inversions: they follow
// Lex Finance's dark theme (graphite grounds #0f1115 / #1c2029, text
// #e7ebf2 / #8b93a3, white glass at .10 / .16) with Ministry's own
// teal/mint accents kept, lifted for contrast on dark.
import { live } from "@/theme/scheme";

export const DS_LIGHT = {
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
  // TASK_078 — row pressed wash and the danger icon tile (were literals).
  pressedBg: "#F5F7FB",
  dangerBg: "#fee2e2",
  // Fill under DS.onAccent icons (AddActionSheet) — deep in both schemes.
  navyFill: "#16294d",
};

// TASK_078 — dark counterparts, same roles. Text roles are measured on
// `cardBg` (#1c2029) and `homeBase` (#0f1115): navy 13:1, subText 6.4:1,
// subInk 7.2:1, accentInk 6.9:1, danger 6.1:1, successInk 8.9:1,
// warnInk 9.6:1, todayInk 6.9:1 — all past WCAG AA.
export const DS_DARK: typeof DS_LIGHT = {
  navy: "#e7ebf2",
  accent: "#5b8bff",
  cardBg: "#1c2029",
  heroBg: "#252c3b",
  subText: "#8b93a3",
  metaText: "#7c8494",
  chevron: "#5d6573",
  segOn: "#5b8bff",
  segOff: "#2a2f3a",
  ringTrack: "#2a2f3a",
  divider: "rgba(255,255,255,0.10)",
  homeBase: "#0f1115",
  teal: "#2fb3c9",
  tealInk: "#4fd0e6",
  green: "#34c759",
  greenInk: "#4ade80",
  amber: "#ff8a1e",
  amberInk: "#fbbf24",
  durationAccent: "#f59e0b",
  shadow: "#000000",
  onAccent: "#ffffff",
  danger: "#f87171",
  subInk: "#9aa3b5",
  successInk: "#4ade80",
  warnInk: "#fbbf24",
  accentInk: "#8fadf7",
  onTintInk: "#aab3c4",
  todayInk: "#fb923c",
  homeMintBase: "#0f1115",
  pressedBg: "#232834",
  dangerBg: "#3b1f22",
  navyFill: "#2f4468",
};
export const DS = live(DS_LIGHT, DS_DARK);

// Gradients (TASK_078: one live cluster; the tuples are read as a whole by
// GoalRing / HomeBackground, so they switch as units).
const GRADIENTS_LIGHT = {
  // Goal ring (blue -> green -> amber).
  ring: ["#4a7dff", "#34c759", "#ffb02e"] as readonly [string, string, string],
  // Home's ring (TASK_010): a single Ministry accent hue, not the multicolor
  // ring above — a restrained gradient within the same blue family.
  accentRing: ["#8fadf7", DS_LIGHT.accent, "#2d55c7"] as readonly [string, string, string],
  // Home-only background gradient (TASK_010; darkened in TASK_017 for a
  // unified high-contrast card system — same sage/gray-turquoise hue, lower
  // lightness so white cards read as clearly brighter surfaces). Deliberately
  // not Apple's exact green. Consumed via <HomeBackground /> by Hours,
  // Timeline, Profile and /upcoming-events.
  home: ["#cfe3d9", "#e3ece8", "#eef2f0"] as readonly [string, string, string],
  // TASK_053 — Home screen's own vertical gradient: calm light mint-blue,
  // per the owner's exact spec (180deg, #DCEFE9 0% / #EDF6F3 42% / #F7FAF9
  // 100%). Separate from `home` above: that one is shared by four other
  // screens.
  homeMint: ["#DCEFE9", "#EDF6F3", "#F7FAF9"] as readonly [string, string, string],
  // Stop offsets (0-1) matching the spec's 0% / 42% / 100%, passed alongside
  // `homeMint` to <HomeBackground> — the default offsets ([0, 0.55, 1] in
  // HomeBackground.tsx) stay the ones the other four screens get.
  homeMintStops: [0, 0.42, 1] as readonly [number, number, number],
};
const GRADIENTS_DARK: typeof GRADIENTS_LIGHT = {
  ring: ["#4a7dff", "#34c759", "#ffb02e"],
  accentRing: ["#8fadf7", DS_DARK.accent, "#3f6fe0"],
  // Graphite with a whisper of the sage hue at the top, into the page ground.
  home: ["#161c22", "#12161b", "#0f1115"],
  // The Home mint, deep: pine-tinted top into the same ground.
  homeMint: ["#0f1f1c", "#111619", "#0f1115"],
  homeMintStops: [0, 0.42, 1],
};
export const GRADIENTS = live(GRADIENTS_LIGHT, GRADIENTS_DARK);


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
//
// TASK_078 — `MINISTRY_LIGHT` is that identity palette, unchanged (the
// hue/contrast guards in tokens.test.ts read it). `MINISTRY_DARK` is the
// same emerald/mint family sunk into a deep pine night, the way Finance's
// dark hero (`--hero-gl-*`: "deeper and quieter, text stays readable")
// relates to its light one — never Finance's own blue.
export type MinistryPalette = {
  primary: string;
  accent: string;
  accentSoft: string;
  heroTop: string;
  heroA: string;
  heroB: string;
  heroC: string;
  heroDeep: string;
  bg: string;
  surface: string;
  ink: string;
  ink2: string;
  heroAlpha: readonly [number, number, number];
  heroLight: number;
};
export const MINISTRY_LIGHT: MinistryPalette = {
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
  // Opacity of the three fold layers a/b/c and the specular sheen strength
  // (shader uniforms). TASK_069: retuned for LexCar's final fold/layer
  // shader — its sheen is added as pure white (`spec * u_light`), so the
  // TASK_065 values (.56 .48 .40 / .62, tuned for the waveShape look) gave
  // bright white spots on the crests. Alpha follows LexCar light
  // (.46 .40 .52) with the pale-mint highlight layer slightly lower, as
  // Finance did in its TASK_058; light .45 keeps the sheen soft.
  heroAlpha: [0.46, 0.40, 0.48],
  heroLight: 0.45,
};
export const MINISTRY_DARK: MinistryPalette = {
  primary: "#3fc4a3",       // lifted teal — accent ink / buttons on graphite (7.9:1 on bg)
  accent: "#2fc492",        // emerald, brighter than light's for dark grounds
  accentSoft: "#163a32",    // pill backgrounds — pine, not a pale mint
  heroTop: "#0f2b26",       // top of the scene — deep pine
  heroA: "#146b55",         // dominant wave — muted emerald
  heroB: "#1d5f52",         // second wave — deep aqua
  heroC: "#284c45",         // highlight — soft pine-mint, never white
  heroDeep: "#06201b",      // valley — near-black pine
  bg: "#0f1115",            // page ground (Finance --bg)
  surface: "#1c2029",       // cards (Finance --card)
  ink: "#e7ebf2",           // headlines (Finance --text)
  ink2: "#a9b8b4",          // secondary — mint-grey, 8.2:1 on heroTop
  // Quieter folds and a much softer sheen, as Finance's dark --hero-gl-*.
  heroAlpha: [0.36, 0.30, 0.28],
  heroLight: 0.2,
};
export const MINISTRY = live(MINISTRY_LIGHT, MINISTRY_DARK);

// `:root{--ministry-*}` for app/+html.tsx. Kebab-case keys, numbers joined
// with spaces (the shader parses "a b c" back into a vec3). TASK_078: one
// block per scheme — the dark one under `[data-theme="dark"]`, which
// ThemeProvider sets on <html> (Finance's applyTheme()); the WebGL hero
// re-reads the variables when the scheme changes.
function cssVarBlock(palette: MinistryPalette): string {
  const entries: string[] = [];
  for (const [key, value] of Object.entries(palette)) {
    const name = `--ministry-${key.replace(/([A-Z0-9])/g, "-$1").toLowerCase()}`;
    entries.push(`${name}:${Array.isArray(value) ? value.join(" ") : String(value)}`);
  }
  return entries.join(";");
}
export function ministryCssVars(): string {
  return `:root{${cssVarBlock(MINISTRY_LIGHT)}}:root[data-theme="dark"]{${cssVarBlock(MINISTRY_DARK)}}`;
}

// ---------------------------------------------------------------------------
// TASK_067 — the floating glass tab bar. Kept OUTSIDE `MINISTRY` on purpose:
// that object is the hex palette the hue/contrast tests and the shader read,
// while these are translucent rgba surfaces derived from it (ink for the
// outlines, accent for the pill). Same approved principle as LexCar /
// Finance's bottom nav (near-clear capsule, glass pill, glass "+"), values
// tuned for Ministry's light mint ground.
//
// TASK_078 — two sets, one component: the dark capsule follows Finance's
// dark nav (`--nav-bg rgba(30,30,36,.42)`, border white .16, pill on the
// accent at .30) — "a separate dark glass, not the same white rgba".
export const NAV_LIGHT = {
  // Capsule — transparency lives in the background only, never as opacity
  // on the whole bar (icons/labels stay fully opaque).
  bg: "rgba(255,255,255,0.12)",
  bgSolid: "rgba(255,255,255,0.94)", // no backdrop-filter (native / old browsers)
  border: "rgba(15,42,38,0.30)", // MINISTRY.ink @ 30 % — the outline holds the capsule
  highlight: "rgba(255,255,255,0.45)", // inset top sheen
  blur: "10px",
  saturate: "150%",
  shadow: "rgba(10,87,72,0.12)", // MINISTRY.heroDeep
  muted: MINISTRY_LIGHT.ink2,
  active: MINISTRY_LIGHT.primary,
  // Active pill — a light lens on the accent, not a solid colour block.
  pillBg: "rgba(31,166,131,0.16)", // MINISTRY.accent
  pillBorder: "rgba(255,255,255,0.40)",
  pillHighlight: "rgba(255,255,255,0.35)",
  pillGlow: "rgba(31,166,131,0.18)",
  // Live-glass decorations while held / dragged.
  glint: "rgba(255,255,255,0.45)",
  edgeLight: "rgba(255,255,255,0.32)",
  edgeDark: "rgba(15,42,38,0.06)",
  // Separate floating "+" button — neutral glass, never a primary blue.
  addBg: "rgba(255,255,255,0.14)",
  addBgSolid: "rgba(255,255,255,0.96)",
  addBorder: "rgba(15,42,38,0.30)",
  addHighlight: "rgba(255,255,255,0.45)",
  addShadow: "rgba(10,87,72,0.14)",
};
export const NAV_DARK: typeof NAV_LIGHT = {
  bg: "rgba(30,30,36,0.42)",
  bgSolid: "rgba(28,32,41,0.96)",
  border: "rgba(255,255,255,0.16)",
  highlight: "rgba(255,255,255,0.10)",
  blur: "16px",
  saturate: "150%",
  shadow: "rgba(0,0,0,0.40)",
  muted: MINISTRY_DARK.ink2,
  active: MINISTRY_DARK.primary,
  pillBg: "rgba(47,196,146,0.26)", // MINISTRY_DARK.accent
  pillBorder: "rgba(255,255,255,0.18)",
  pillHighlight: "rgba(255,255,255,0.16)",
  pillGlow: "rgba(47,196,146,0.20)",
  glint: "rgba(255,255,255,0.20)",
  edgeLight: "rgba(255,255,255,0.18)",
  edgeDark: "rgba(0,0,0,0.18)",
  addBg: "rgba(30,30,36,0.42)",
  addBgSolid: "rgba(36,40,52,0.97)",
  addBorder: "rgba(255,255,255,0.16)",
  addHighlight: "rgba(255,255,255,0.12)",
  addShadow: "rgba(0,0,0,0.42)",
};
export const NAV = live(NAV_LIGHT, NAV_DARK);

// ---------------------------------------------------------------------------
// TASK_071 — the Home hero's headline figure ("37 ч") as frosted glass. The
// GLYPHS are the glass, not a plate under them: a translucent gradient fill
// clipped to the text, a soft teal shadow beneath, a hairline dark bottom
// edge for depth and a faint white rim. Kept outside `MINISTRY` like `NAV`:
// these are rgba surfaces derived from the palette (white + heroDeep), not
// hex tokens the hue/contrast tests or the shader read. The unit ("ч"/"м")
// gets the same layers at lower strength so it stays secondary.
// TASK_078 — on dark the glass stays white-ish glyphs, the lift beneath
// goes black and the mint base tint deepens a touch.
export const FIGURE_GLASS_LIGHT = {
  // Body fill (web: background-clip:text gradient, top → bottom).
  bodyTop: "rgba(255,255,255,0.98)",
  bodyLight: "rgba(255,255,255,0.90)",
  bodyMid: "rgba(255,255,255,0.74)",
  bodyBottom: "rgba(214,240,231,0.70)", // pale mint, MINISTRY.heroC-ish — never pure white at the base
  unitBodyTop: "rgba(255,255,255,0.94)",
  unitBodyMid: "rgba(255,255,255,0.66)",
  unitBodyBottom: "rgba(214,240,231,0.60)",
  // Native (no background-clip): one flat frosted fill.
  bodySolid: "rgba(255,255,255,0.92)",
  unitBodySolid: "rgba(255,255,255,0.78)",
  // Soft lift under the glass — MINISTRY.heroDeep at low alpha.
  shadowFar: "rgba(10,87,72,0.30)",
  shadowNear: "rgba(10,87,72,0.22)",
  unitShadowFar: "rgba(10,87,72,0.22)",
  unitShadowNear: "rgba(10,87,72,0.16)",
  // Hairline dark bottom edge (depth) and the white rim (edge light).
  depth: "rgba(10,87,72,0.34)",
  unitDepth: "rgba(10,87,72,0.26)",
  depthOffset: 1.5,
  rim: "rgba(255,255,255,0.75)",
  rimWidth: 1,
};
export const FIGURE_GLASS_DARK: typeof FIGURE_GLASS_LIGHT = {
  bodyTop: "rgba(255,255,255,0.96)",
  bodyLight: "rgba(255,255,255,0.86)",
  bodyMid: "rgba(255,255,255,0.68)",
  bodyBottom: "rgba(166,222,204,0.62)",
  unitBodyTop: "rgba(255,255,255,0.90)",
  unitBodyMid: "rgba(255,255,255,0.60)",
  unitBodyBottom: "rgba(166,222,204,0.52)",
  bodySolid: "rgba(255,255,255,0.90)",
  unitBodySolid: "rgba(255,255,255,0.74)",
  shadowFar: "rgba(0,0,0,0.45)",
  shadowNear: "rgba(0,0,0,0.35)",
  unitShadowFar: "rgba(0,0,0,0.35)",
  unitShadowNear: "rgba(0,0,0,0.26)",
  depth: "rgba(0,0,0,0.50)",
  unitDepth: "rgba(0,0,0,0.40)",
  depthOffset: 1.5,
  rim: "rgba(255,255,255,0.40)",
  rimWidth: 1,
};
export const FIGURE_GLASS = live(FIGURE_GLASS_LIGHT, FIGURE_GLASS_DARK);

// ---------------------------------------------------------------------------
// TASK_077 — the Home drawer's own light, copied from Lex Finance's drawer
// (index.html: `.drawer` background layers, `.drawer::before/::after` drift
// blobs, `--hero-*` light tokens, `.drawer-card` glass) at the owner's
// request to reproduce that light "exactly". Kept OUTSIDE `MINISTRY` like
// `NAV` / `FIGURE_GLASS`: that object is the teal/mint identity the
// hue/contrast tests and the hero shader read; the drawer is deliberately
// NOT painted in it (TASK_066's mint HeroScene read as "too green"). The
// `MINISTRY`-band guards in tokens.test.ts are about MINISTRY only — this
// cluster is *meant* to match Finance. Scoped to src/components/drawer/*
// and the "drawer" variant of ProfileSettingsRow — nothing else adopts it.
// TASK_078 — `DRAWER_ICE_DARK` is Finance's DARK `--hero-*` set verbatim
// (`#111827` top, glow rgba(120,160,255,.10), b1–b4 at .34/.22/.18/.30,
// glass white .10 / .16, sep white .14) with its dark `--text` / `--muted`.
export const DRAWER_ICE_LIGHT = {
  // Vertical ground: Finance `--hero-top` → `--hero-bottom` at 58 %, then
  // flat; `bottom` is also the panel ground past the scene (no seam).
  top: "#dbeafe",
  bottom: "#eef2f8",
  // Static light layers, top → bottom of the CSS `background` list:
  //   white glow   radial 120%×50% at 50% 10%   (--hero-glow)
  //   cyan pool    radial  90%×40% at 100% 62%  (--hero-b2)
  //   turquoise    radial  80%×36% at 0% 92%    (--hero-b3)
  // each fading to transparent at 60 % of its ellipse.
  glow: { color: "#ffffff", alpha: 0.55 },
  poolCyan: { color: "#22d3ee", alpha: 0.55 },
  poolTurquoise: { color: "#2dd4bf", alpha: 0.5 },
  // The two drifting blobs (::before sky blue / ::after medium blue), each a
  // circle fading to transparent at 64 %; geometry lives in DrawerScene.
  blobSky: { color: "#60a5fa", alpha: 0.72 },
  blobBlue: { color: "#4f7df0", alpha: 0.52 },
  // Type: Finance `--text`; secondary is the darkest step of Finance's
  // `--muted` (#6b7180) family that clears WCAG AA (4.5:1) on the ground,
  // on glass over any pool and on the cyan/turquoise pools at full
  // strength. Over the sky blob's very centre (under the avatar) it is
  // 3.3:1 — Finance's own muted measures 2.4:1 there; accepted as the one
  // Finance-parity exception, documented in TASK_077.
  ink: "#16181f",
  ink2: "#4f5c70",
  chevron: "rgba(154,160,176,0.7)", // --muted2 at the reference's .7 opacity
  // Glass (`--hero-glass` / `--hero-glass-border`) for cards, the head's
  // pressed state, the avatar ring and the × button.
  glass: "rgba(255,255,255,0.55)",
  glassBorder: "rgba(255,255,255,0.75)",
  glassPressed: "rgba(255,255,255,0.78)",
  // `.drawer-sep`: --hero-sep rgba(22,24,31,.12) drawn at opacity .45.
  sep: "rgba(22,24,31,0.054)",
  // `--tx-card-shadow` 0 2px 10px rgba(30,41,80,.05) and `--nav-shadow`
  // 0 10px 30px rgba(40,50,120,.10) as RN shadow props.
  cardShadow: "#1e2950",
  cardShadowOpacity: 0.05,
  panelShadow: "#283278",
  panelShadowOpacity: 0.1,
  // `.overlay.drawer-ov`: rgba(20,22,34,.30) + blur(16px) saturate(140%).
  backdrop: "rgba(20,22,34,0.30)",
};
export const DRAWER_ICE_DARK: typeof DRAWER_ICE_LIGHT = {
  top: "#111827",
  bottom: "#171a21", // --home-bg = --bg2
  glow: { color: "#78a0ff", alpha: 0.1 },
  poolCyan: { color: "#06b6d4", alpha: 0.22 },
  poolTurquoise: { color: "#14b8a6", alpha: 0.18 },
  blobSky: { color: "#3b82f6", alpha: 0.34 },
  blobBlue: { color: "#5b8bff", alpha: 0.3 },
  ink: "#e7ebf2",
  // Finance's dark --muted (#8b93a3) is 3.5:1 on the sky blob's centre;
  // lifted one step (same grey-blue) to clear AA there — the mirror of the
  // light set's #4f5c70 decision.
  ink2: "#a3abbb",
  chevron: "rgba(163,171,187,0.7)", // ink2 at .7 (dark --muted2 #5d6573 would vanish)
  glass: "rgba(255,255,255,0.10)",
  glassBorder: "rgba(255,255,255,0.16)",
  glassPressed: "rgba(255,255,255,0.18)",
  sep: "rgba(255,255,255,0.063)", // --hero-sep .14 × .45
  cardShadow: "#000000",
  cardShadowOpacity: 0.3,
  panelShadow: "#000000",
  panelShadowOpacity: 0.4,
  backdrop: "rgba(0,0,0,0.45)",
};
export const DRAWER_ICE = live(DRAWER_ICE_LIGHT, DRAWER_ICE_DARK);

// ---------------------------------------------------------------------------
// TASK_078 — translucent surfaces that used to be literal white rgba in
// HomeHero / heroFigure / ParticipationMiniCalendar / the ☰ button: on the
// light mint hero they are white washes; on the dark pine hero a white
// wash reads as a grey slab, so they become faint white lifts instead
// (Finance's `--hero-glass` .10 / `--hero-glass-border` .16 on dark).
export const HERO_GLASS_LIGHT = {
  pill: "rgba(255,255,255,0.55)",
  pillPrimary: "rgba(255,255,255,0.72)",
  track: "rgba(255,255,255,0.55)",
  card: "rgba(255,255,255,0.38)",
  cardBorder: "rgba(255,255,255,0.65)",
  pressed: "rgba(255,255,255,0.35)",
  onAccentRing: "rgba(255,255,255,0.9)",
  hairline: "rgba(0,0,0,0.06)",
};
export const HERO_GLASS_DARK: typeof HERO_GLASS_LIGHT = {
  pill: "rgba(255,255,255,0.10)",
  pillPrimary: "rgba(255,255,255,0.18)",
  track: "rgba(255,255,255,0.14)",
  card: "rgba(255,255,255,0.08)",
  cardBorder: "rgba(255,255,255,0.14)",
  pressed: "rgba(255,255,255,0.12)",
  onAccentRing: "rgba(255,255,255,0.9)",
  hairline: "rgba(255,255,255,0.10)",
};
export const HERO_GLASS = live(HERO_GLASS_LIGHT, HERO_GLASS_DARK);
