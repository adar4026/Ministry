import { Platform, StyleSheet, Text, View } from "react-native";
import { FIGURE_GLASS, MINISTRY } from "./tokens";

// TASK_073 — the Home hero's shared presentation pieces, split out of
// HomeHero.tsx so both content variants (hours for pioneers, participation
// days for publishers) render the very same frosted-glass headline figure
// and the same light glass pills. Nothing here reads the store.

// TASK_071 — the headline figure is FROSTED GLASS, and the glyphs themselves
// are the glass: no plate, no card, nothing behind the digits. A true
// backdrop-filter cannot be clipped to a text shape, so the glass is built
// from layers of the very same "number + unit" row stacked on one another:
//   shadow — transparent text carrying a soft teal text-shadow (the lift
//            that keeps light glass legible on the light mint scene),
//   depth  — the row again, 1.5 pt lower, in a thin dark teal: the bottom
//            edge of a thick pane,
//   body   — the in-flow row: a translucent white→pale-mint gradient clipped
//            to the text (bright at the top = inner light, more see-through
//            towards the base),
//   rim    — transparent text with a hairline white stroke: the edge light.
// The unit ("ч"/"м") gets the same layers at lower strength so it stays
// secondary. Native has neither background-clip:text nor text-stroke, so it
// renders the body alone as a flat frosted fill with a soft shadow. All the
// rgba values live in FIGURE_GLASS (tokens.ts).
export type GlassLayer = "shadow" | "depth" | "body" | "rim";
type GlassStyles = Record<"number" | "unit", Record<GlassLayer, object>>;

/**
 * Per-layer text styles for the glass figure. Pure so the web contract can
 * be unit-tested from the (iOS) jest preset. Web: four layers; native: only
 * `body` carries anything, the overlay layers are never rendered.
 */
export function figureGlassStyles(os: string): GlassStyles {
  const G = FIGURE_GLASS;
  if (os === "web") {
    const clipped = { backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent" };
    return {
      number: {
        body: {
          ...clipped,
          backgroundImage: `linear-gradient(180deg, ${G.bodyTop} 0%, ${G.bodyLight} 28%, ${G.bodyMid} 62%, ${G.bodyBottom} 100%)`,
        },
        shadow: { color: "transparent", textShadow: `0 8px 22px ${G.shadowFar}, 0 1px 3px ${G.shadowNear}` },
        depth: { color: G.depth },
        rim: { color: "transparent", WebkitTextStroke: `${G.rimWidth}px ${G.rim}` },
      },
      unit: {
        body: {
          ...clipped,
          backgroundImage: `linear-gradient(180deg, ${G.unitBodyTop} 0%, ${G.unitBodyMid} 55%, ${G.unitBodyBottom} 100%)`,
        },
        shadow: { color: "transparent", textShadow: `0 6px 16px ${G.unitShadowFar}, 0 1px 2px ${G.unitShadowNear}` },
        depth: { color: G.unitDepth },
        rim: { color: "transparent", WebkitTextStroke: `${G.rimWidth}px ${G.rim}` },
      },
    };
  }
  const none = {};
  return {
    number: {
      body: { color: G.bodySolid, textShadowColor: G.shadowFar, textShadowOffset: { width: 0, height: 6 }, textShadowRadius: 14 },
      shadow: none, depth: none, rim: none,
    },
    unit: {
      body: { color: G.unitBodySolid, textShadowColor: G.unitShadowFar, textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 10 },
      shadow: none, depth: none, rim: none,
    },
  };
}

const GLASS_STYLES = figureGlassStyles(Platform.OS);
// Overlay layers exist on web only; native renders just the body.
const GLASS_OVERLAYS_UNDER: GlassLayer[] = Platform.OS === "web" ? ["shadow", "depth"] : [];
const GLASS_OVERLAYS_OVER: GlassLayer[] = Platform.OS === "web" ? ["rim"] : [];

// The headline digits in the platform's rounded system face: on iOS/macOS
// Safari `ui-rounded` resolves to SF Rounded, elsewhere the chain falls back
// to the regular system UI font. Native RN has no cross-platform alias for
// SF Rounded without shipping a font, so it keeps the system default — no
// new font dependency either way.
const FIGURE_FONT = Platform.select<object>({
  web: { fontFamily: 'ui-rounded, -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' },
  default: {},
});

/**
 * "1 ч 30 м" → [["1", "ч"], ["30", "м"]]; "37 ч" → [["37", "ч"]]. Pure
 * layout helper for the headline — the string itself comes unchanged from
 * formatHMRounded(). Anything that does not match (e.g. "—") comes back as
 * a single number-less pair so it still renders.
 */
export function splitDuration(text: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  const re = /(\d+)\s*([^\d\s]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) pairs.push([m[1], m[2]]);
  return pairs.length ? pairs : [[text, ""]];
}

/**
 * One "number + unit" row of the headline — pairs of (number, unit) on one
 * baseline. Rendered once in flow as the glass `body` and, on web, again as
 * each overlay layer stacked on it. Only the body carries the testID and
 * `numberOfLines`: RNW turns numberOfLines into overflow:hidden, which would
 * clip the shadow layer's blur to a hard rectangle.
 */
function FigureRow({ pairs, layer }: { pairs: Array<[string, string]>; layer: GlassLayer }) {
  const body = layer === "body";
  return (
    <View style={styles.figure} testID={body ? "home-hero-figure" : undefined}>
      {pairs.map(([num, unit], i) => (
        <View key={i} style={[styles.figurePair, i > 0 && styles.figurePairNext]}>
          <Text style={[styles.figureNumber, FIGURE_FONT, GLASS_STYLES.number[layer]]} numberOfLines={body ? 1 : undefined}>
            {num}
          </Text>
          {unit ? (
            <Text style={[styles.figureUnit, FIGURE_FONT, GLASS_STYLES.unit[layer]]} numberOfLines={body ? 1 : undefined}>
              {unit}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}


/**
 * The hero's one centred element: the frosted-glass headline (TASK_070/071)
 * — a full-width wrapper centres the figure on the screen; the figure itself
 * is a baseline-aligned row of (number, unit) pairs stacked into glass
 * layers (see figureGlassStyles); the stack is exactly the body row's size,
 * overlays are absolute. Wrapped in importantForAccessibility="no": the
 * caller provides the spoken summary.
 */
export function GlassFigure({ pairs }: { pairs: Array<[string, string]> }) {
  return (
    <View style={styles.figureWrap} importantForAccessibility="no" testID="home-hero-figure-wrap">
      <View style={styles.figureStack} testID="home-hero-figure-stack">
        {GLASS_OVERLAYS_UNDER.map((layer) => (
          <View
            key={layer}
            style={[styles.figureLayer, layer === "depth" && { top: FIGURE_GLASS.depthOffset }]}
            pointerEvents="none"
            aria-hidden
            importantForAccessibility="no-hide-descendants"
            testID={`home-hero-figure-${layer}`}
          >
            <FigureRow pairs={pairs} layer={layer} />
          </View>
        ))}
        <View style={styles.figureBody}>
          <FigureRow pairs={pairs} layer="body" />
        </View>
        {GLASS_OVERLAYS_OVER.map((layer) => (
          <View
            key={layer}
            style={[styles.figureLayer, styles.figureLayerOver]}
            pointerEvents="none"
            aria-hidden
            importantForAccessibility="no-hide-descendants"
            testID={`home-hero-figure-${layer}`}
          >
            <FigureRow pairs={pairs} layer={layer} />
          </View>
        ))}
      </View>
    </View>
  );
}

// Very light glass for the pills: translucent white, a touch of blur on
// web, no border — enough to lift the label off a passing wave, not enough
// to read as a container.
export const PILL_GLASS = Platform.select<object>({
  web: { backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" },
  default: {},
});

// Shared hero styles: the figure geometry (TASK_070/071) and the two action
// pills. Captions/metrics stay with each content variant.
export const HERO = StyleSheet.create({
  // Full-width wrapper that centres the figure on the screen. ONLY the
  // figure is centred; the caption and everything below stay left-aligned.
  // No extra space above beyond the screen's heroBlock gap (TASK_074): the
  // figure sits close under the date line, not floated away from it.
  figureWrap: { width: "100%", alignItems: "center", justifyContent: "center", marginTop: 0 },
  // TASK_071 — the glass stack: sized by the in-flow body row; the overlay
  // layers are absolute copies of that row (same content, same width, same
  // centring), so they land glyph-on-glyph without touching the layout.
  figureStack: { position: "relative" },
  figureLayer: { position: "absolute", left: 0, right: 0, top: 0, alignItems: "center", zIndex: 0 },
  figureLayerOver: { zIndex: 2 },
  figureBody: { zIndex: 1 },
  // The whole "37 ч" / "1 ч 30 м" run: pairs of (number, unit) on one
  // baseline, exactly one 64 pt line tall.
  figure: { flexDirection: "row", alignItems: "baseline", flexWrap: "nowrap", justifyContent: "center" },
  figurePair: { flexDirection: "row", alignItems: "baseline" },
  figurePairNext: { marginLeft: 12 },
  // The digits: large (60) but a MEDIUM weight (600) — a dashboard KPI, not
  // a bold heading. Slightly negative tracking keeps two digits compact;
  // tabular digits keep the width steady as the number grows. Colour/fill
  // comes from the glass layer (figureGlassStyles), not from here.
  figureNumber: {
    fontSize: 60,
    lineHeight: 64,
    fontWeight: "600",
    letterSpacing: -1.5,
    fontVariant: ["tabular-nums"],
  },
  // The unit ("ч", "м"): secondary — 24 pt, weight 500, a more see-through
  // glass than the digits — on the digits' baseline and tucked right against
  // them (2 pt), so "37 ч" reads as one typographic unit rather than "37" +
  // a stray "ч".
  figureUnit: {
    marginLeft: 2,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  caption: { marginTop: 4, fontSize: 14, lineHeight: 18, fontWeight: "600", color: MINISTRY.ink2 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  pillPrimary: { backgroundColor: "rgba(255,255,255,0.72)" },
  pillText: { fontSize: 14, lineHeight: 18, fontWeight: "700", color: MINISTRY.primary },
  pressed: { opacity: 0.8 },
});
const styles = HERO;
