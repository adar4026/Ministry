import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { DS, RING_STOPS } from "./tokens";

// Circular progress ring for a goal (TASK_007). Presentational only — takes a
// precomputed percentage; no calculation happens here. Gradient stroke
// (blue -> green -> amber). Reusable by any future "progress toward a goal"
// surface (Statistics, Service Year, …).
export function GoalRing({
  pct,
  goalHours,
  size = 132,
}: {
  pct: number;
  goalHours: number;
  size?: number;
}) {
  const stroke = 13;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const dash = (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="goalRing" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={RING_STOPS[0]} />
            <Stop offset="0.5" stopColor={RING_STOPS[1]} />
            <Stop offset="1" stopColor={RING_STOPS[2]} />
          </LinearGradient>
        </Defs>
        <Circle cx={center} cy={center} r={r} stroke={DS.ringTrack} strokeWidth={stroke} fill="none" />
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
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.pct}>
          {Math.round(pct)}
          <Text style={styles.sign}>%</Text>
        </Text>
        <Text style={styles.sub}>из {goalHours} ч</Text>
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
  pct: { fontSize: 34, fontWeight: "800", color: DS.navy, letterSpacing: -1 },
  sign: { fontSize: 18, fontWeight: "800", color: DS.navy },
  sub: { fontSize: 13, color: DS.metaText, fontWeight: "600", marginTop: 2 },
});
