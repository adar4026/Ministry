// Compact progress ring for the Home monthly card. A focused sibling of
// GoalRing.tsx, not a modification of it — GoalRing keeps its existing
// gradient/tone behavior unchanged for any future consumer.
//
// TASK_028: replaced the single interpolated-color arc (amber -> accent ->
// green, length = pct) with a decorative three-segment ring (green/blue/red,
// green largest, blue second, red a small accent) — fixed proportions that
// never change with `pct`, matching the owner's reference image (a 71%
// reading with segments covering visibly less than 71% of the circle, i.e.
// the segments were never meant to encode the percentage themselves). The
// center percentage remains the only thing this component still computes
// from `pct`.
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { DS } from "./tokens";

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

// Fixed decorative layout, degrees: green (largest) -> gap -> blue (second)
// -> gap -> red (small accent) -> gap -> back to start. Never derived from
// `pct` — purely decorative, per the owner's explicit requirement ("цветные
// сегменты являются визуальным оформлением одного общего прогресса, а не
// тремя отдельными показателями").
const GAP_DEG = 14;
const GREEN_DEG = 159;
const BLUE_DEG = 106;
const RED_DEG = 53; // 3*14 + 159 + 106 + 53 === 360

const SEGMENTS = [
  { color: "green" as const, startDeg: 0, lengthDeg: GREEN_DEG },
  { color: "blue" as const, startDeg: GREEN_DEG + GAP_DEG, lengthDeg: BLUE_DEG },
  { color: "red" as const, startDeg: GREEN_DEG + GAP_DEG + BLUE_DEG + GAP_DEG, lengthDeg: RED_DEG },
];

const SEGMENT_COLOR: Record<(typeof SEGMENTS)[number]["color"], string> = {
  green: DS.green,
  blue: DS.accent,
  red: DS.danger,
};

export function HeroProgressRing({ pct, size = 48 }: { pct: number; size?: number }) {
  // Defensive against a caller passing NaN/Infinity (e.g. a future goal-less
  // consumer computing pct as 0/0) — never let an invalid value reach the
  // percentage text.
  const safePct = Number.isFinite(pct) ? pct : 0;
  const displayValue = Math.round(safePct);

  // Stroke scales with size (rather than a fixed 13px) so the white center
  // keeps the same proportional share of the ring as `size` shrinks —
  // otherwise a smaller ring leaves less room for the percentage text.
  const stroke = Math.round(size * 0.19);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const center = size / 2;

  const digits = Math.abs(displayValue).toString().length;
  const scale = fontScaleForDigits(digits);
  const pctFontSize = Math.round(size * scale);
  const signFontSize = Math.round(size * scale * 0.55);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={r} stroke={DS.ringTrack} strokeWidth={stroke} fill="none" />
        {SEGMENTS.map((seg) => {
          const dash = (seg.lengthDeg / 360) * circumference;
          return (
            <Circle
              key={seg.color}
              cx={center}
              cy={center}
              r={r}
              stroke={SEGMENT_COLOR[seg.color]}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={[dash, circumference - dash]}
              rotation={-90 + seg.startDeg}
              originX={center}
              originY={center}
            />
          );
        })}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {/* Text shows the true (uncapped) percentage — e.g. 130% when the
            goal is exceeded — matching GoalRing.tsx; the ring itself is
            fixed decoration and never reflects this value. Font size
            shrinks with digit count (see fontScaleForDigits) so it always
            stays inside the white center instead of overlapping the stroke. */}
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
