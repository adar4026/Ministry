// Compact progress ring for the Home monthly card (TASK_015). A focused
// sibling of GoalRing.tsx, not a modification of it — GoalRing keeps its
// existing gradient/tone behavior unchanged for any future consumer.
// Differences from GoalRing:
//   - solid color that interpolates continuously with progress (amber ->
//     accent -> green) instead of a fixed gradient painted across the arc;
//   - percentage text scales with both `size` and digit count (1/2/3+
//     digits) instead of a fixed 34px, since this card uses a smaller ring
//     than GoalRing's default and must keep 100%+ readings clear of the
//     stroke.
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { DS } from "./tokens";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// Continuous interpolation, not discrete buckets: 0% is fully amber, 50% is
// fully accent blue, 100% is fully green, blending smoothly in between so
// the ring visibly shifts hue with every hour logged, not just at
// thresholds. `pct` here is expected pre-clamped by the caller; this
// function clamps again defensively.
function colorForPct(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  if (clamped <= 50) return mixHex(DS.amber, DS.accent, clamped / 50);
  return mixHex(DS.accent, DS.green, (clamped - 50) / 50);
}

// Font scale keyed to how many digits the displayed percentage needs — a
// fixed font size that's safe for "76%" overflows into the blue arc for
// "100%"/"130%" on a ring this small. Chosen so 1–2 digits keep the original
// proportions and 3+ digits (goal met or exceeded) shrink just enough to
// stay clear of the stroke.
function fontScaleForDigits(digits: number): number {
  if (digits >= 3) return 0.19;
  if (digits === 2) return 0.24;
  return 0.28;
}

export function HeroProgressRing({ pct, size = 48 }: { pct: number; size?: number }) {
  // Defensive against a caller passing NaN/Infinity (e.g. a future goal-less
  // consumer computing pct as 0/0) — never let an invalid value reach SVG
  // stroke-dasharray math.
  const safePct = Number.isFinite(pct) ? pct : 0;
  const clamped = Math.max(0, Math.min(100, safePct));
  const displayValue = Math.round(safePct);

  // Stroke scales with size (rather than a fixed 13px) so the white center
  // keeps the same proportional share of the ring as `size` shrinks —
  // otherwise a smaller ring leaves less room for the percentage text.
  // Ratio tuned down slightly (TASK_016) for a leaner, less heavy arc that
  // reads more as a precise indicator than a thick band.
  const stroke = Math.round(size * 0.19);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (clamped / 100) * circumference;
  const center = size / 2;
  const color = colorForPct(clamped);

  const digits = Math.abs(displayValue).toString().length;
  const scale = fontScaleForDigits(digits);
  const pctFontSize = Math.round(size * scale);
  const signFontSize = Math.round(size * scale * 0.55);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={r} stroke={DS.ringTrack} strokeWidth={stroke} fill="none" />
        {/* Zero progress: skip the fill circle entirely — a round line-cap
            on a zero-length dash still paints a stray dot (same guard as
            GoalRing.tsx). */}
        {dash > 0 && (
          <Circle
            cx={center}
            cy={center}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={[dash, circumference - dash]}
            rotation={-90}
            originX={center}
            originY={center}
          />
        )}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {/* Text shows the true (uncapped) percentage — e.g. 130% when the
            goal is exceeded — matching GoalRing.tsx; only the arc and its
            color clamp to the visual 0–100% range. Font size shrinks with
            digit count (see fontScaleForDigits) so it always stays inside
            the white center instead of overlapping the stroke. */}
        <Text style={[styles.pct, { fontSize: pctFontSize }]}>
          {displayValue}
          <Text style={[styles.sign, { fontSize: signFontSize }]}>%</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  pct: { fontWeight: "800", color: DS.navy, letterSpacing: -0.5 },
  sign: { fontWeight: "800", color: DS.navy },
});
