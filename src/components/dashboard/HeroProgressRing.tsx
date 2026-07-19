// Compact progress ring for the Home monthly card. A focused sibling of
// GoalRing.tsx, not a modification of it — GoalRing keeps its existing
// gradient/tone behavior unchanged for any future consumer.
//
// TASK_029: reverted TASK_028's fixed decorative three-segment ring — the
// owner clarified after seeing it live that the ring must keep growing
// with `pct` as hours are logged, not sit as a static decoration. Back to a
// single arc whose length is `pct`, now colored red -> blue -> green
// (was amber -> accent -> green pre-TASK_028) with the green transition
// deliberately starting near the finish line (~80%, "~40 of 50 goal
// hours"), not at the halfway point.
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

// Piecewise interpolation through three color stops (TASK_029) — 0% is
// fully red, 50% is fully blue, 80%+ is fully green ("norm fulfilled"); the
// last leg is deliberately a 30-point stretch (50-80%), not the 50-100%
// split used pre-TASK_028, so the ring reads as "on track" (blue) for
// longer and only turns green near the actual finish line. Percentage-based
// (not an absolute hour count) so the 80% breakpoint stays correct if
// MONTHLY_GOAL ever changes. `pct` here is expected pre-clamped by the
// caller; this function clamps again defensively.
function colorForPct(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  if (clamped <= 50) return mixHex(DS.danger, DS.accent, clamped / 50);
  if (clamped <= 80) return mixHex(DS.accent, DS.green, (clamped - 50) / 30);
  return DS.green;
}

// Font scale keyed to how many digits the displayed percentage needs — a
// fixed font size that's safe for "76%" overflows into the ring for
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
  pct: { fontWeight: "700", color: DS.navy, letterSpacing: -0.5 },
  sign: { fontWeight: "700", color: DS.navy },
});
