import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { ACCENT_RING_STOPS, DS, RING_STOPS } from "./tokens";

// Circular progress ring for a goal (TASK_007). Presentational only — takes a
// precomputed percentage; no calculation happens here. Reusable by any future
// "progress toward a goal" surface (Statistics, Service Year, …).
export function GoalRing({
  pct,
  goalHours,
  size = 132,
  showGoalLabel = true,
  tone = "multi",
}: {
  pct: number;
  goalHours: number;
  size?: number;
  // TASK_010: Home's compact card moves the "из N ч" label out of the ring
  // (it now lives next to the hours value) so only the percentage remains
  // inside the circle. Defaults to true — unchanged for any other consumer.
  showGoalLabel?: boolean;
  // TASK_010: Home uses a single Ministry accent color ("accent" — a
  // restrained same-family two-stop blue gradient), not the original
  // multicolor blue/green/amber "Fitness ring" gradient ("multi", default,
  // unchanged for any other consumer of this component).
  tone?: "multi" | "accent";
}) {
  const stroke = 13;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const dash = (clamped / 100) * circumference;
  const center = size / 2;
  const stops = tone === "accent" ? ACCENT_RING_STOPS : RING_STOPS;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="goalRing" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={stops[0]} />
            <Stop offset="0.5" stopColor={stops[1]} />
            <Stop offset="1" stopColor={stops[2]} />
          </LinearGradient>
        </Defs>
        <Circle cx={center} cy={center} r={r} stroke={DS.ringTrack} strokeWidth={stroke} fill="none" />
        {/* Zero progress: skip the fill circle entirely — a round line-cap
            on a zero-length dash still paints a stray dot. */}
        {dash > 0 && (
          <Circle
            cx={center}
            cy={center}
            r={r}
            stroke="url(#goalRing)"
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
        <Text style={styles.pct}>
          {Math.round(pct)}
          <Text style={styles.sign}>%</Text>
        </Text>
        {showGoalLabel && <Text style={styles.sub}>из {goalHours} ч</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  pct: { fontSize: 34, fontWeight: "700", color: DS.navy, letterSpacing: -1 },
  sign: { fontSize: 19, fontWeight: "700", color: DS.navy },
  sub: { fontSize: 14, fontWeight: "600", color: DS.metaText, marginTop: 2 },
});
