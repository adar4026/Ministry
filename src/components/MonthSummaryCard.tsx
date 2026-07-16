import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { COLORS, formatHM, MONTHLY_GOAL, monthProgress, dayWord } from "@/data/constants";
import { useStore } from "@/store/StoreContext";

interface MonthSummaryCardProps {
  hoursDone: number;
  goal: number;
  pace: number;        // minutes per day
  daysLeft: number;
  onPress?: () => void;
}

export function MonthSummaryCard({
  hoursDone,
  goal,
  pace,
  daysLeft,
  onPress,
}: MonthSummaryCardProps) {
  const { records, sessions } = useStore();
  const p = monthProgress(records, new Date(), sessions);
  const hoursRemaining = Math.max(0, goal - p.hoursDone);
  const pct = goal > 0 ? Math.round((p.hoursDone / goal) * 100) : 0;
  const filledSegments = Math.round((Math.min(100, pct) / 100) * 7);

  const statusColor = p.status === "ahead" ? COLORS.green : p.status === "behind" ? COLORS.danger : COLORS.warn;
  const statusLabel = p.status === "ahead" ? "Оперёд" : p.status === "behind" ? "Отстаёт" : "В графике";

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Часы на начало: ${formatHM(p.hoursDone)} из ${goal} ч. ${statusLabel}`}
    >
      <View style={styles.topRow}>
        <View style={styles.left}>
          <Text style={styles.totalHours}>{formatHM(p.hoursDone)}</Text>
          <Text style={styles.subLabel}>за этот месяц</Text>
          <View style={styles.segmentedBar}>
            {Array.from({ length: 7 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.segment,
                  i < filledSegments ? styles.segmentOn : styles.segmentOff,
                ]}
              />
            ))}
          </View>
          <Text style={styles.pctLine}>
            <Text style={[styles.pctValue, { color: statusColor }]}>{pct}%</Text>{" "}
            до месячной цели
          </Text>
        </View>
        <View style={styles.ringWrapper}>
          <Svg width={110} height={110}>
            <Circle
              cx={55}
              cy={55}
              r={48}
              stroke={COLORS.border}
              strokeWidth={10}
              fill="none"
            />
            <Circle
              cx={55}
              cy={55}
              r={48}
              stroke={statusColor}
              strokeWidth={10}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={(pct / 100) * 2 * Math.PI * 48}
              strokeDashoffset={2 * Math.PI * 48}
              transform="rotate(-90 55 55)"
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={styles.ringPct}>
              {pct}% <Text style={styles.ringSub}>/ {goal} ч</Text>
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.chipsRow}>
        <View style={[styles.chip, { borderColor: COLORS.green }]}>
          <View style={[styles.chipDot, { backgroundColor: COLORS.green }]} />
          <View style={styles.chipText}>
            <Text style={styles.chipLabel}>До цели осталось</Text>
            <Text style={styles.chipValue}>
              {hoursRemaining > 0 ? formatHM(hoursRemaining) : "Цель достигнута"}
            </Text>
          </View>
        </View>
        <View style={[styles.chip, { borderColor: COLORS.warn }]}>
          <View style={[styles.chipDot, { backgroundColor: COLORS.warn }]} />
          <View style={styles.chipText}>
            <Text style={styles.chipLabel}>Осталось дней</Text>
            <Text style={styles.chipValue}>{daysLeft} {dayWord(daysLeft)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusBadgeText}>{statusLabel}</Text>
        </View>
        {pace > 0 && (
          <Text style={styles.paceText}>
            Темп: {formatHM(pace / 60)} в день
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  pressed: { opacity: 0.9 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  left: { flex: 1 },
  totalHours: { fontSize: 36, fontWeight: "800", color: COLORS.navy, letterSpacing: -0.8 },
  subLabel: { fontSize: 14, color: COLORS.muted, fontWeight: "600", marginTop: 4 },
  segmentedBar: { flexDirection: "row", gap: 4, marginTop: 12 },
  segment: { flex: 1, height: 10, borderRadius: 5 },
  segmentOn: { backgroundColor: COLORS.accent },
  segmentOff: { backgroundColor: COLORS.border },
  pctLine: { fontSize: 14, color: COLORS.muted, fontWeight: "600", marginTop: 8 },
  pctValue: { fontWeight: "800" },
  ringWrapper: { position: "relative", width: 110, height: 110 },
  ringCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  ringPct: { fontSize: 28, fontWeight: "800", color: COLORS.navy, letterSpacing: -0.5 },
  ringSub: { fontSize: 14, fontWeight: "600", color: COLORS.muted },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },
  chipsRow: { flexDirection: "row", gap: 12 },
  chip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1.5, borderRadius: 14 },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { flex: 1 },
  chipLabel: { fontSize: 12, color: COLORS.muted, fontWeight: "600" },
  chipValue: { fontSize: 16, fontWeight: "800", letterSpacing: -0.2, marginTop: 2, color: COLORS.navy },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusBadgeText: { fontSize: 12, fontWeight: "700", color: COLORS.onAccent },
  paceText: { fontSize: 13, color: COLORS.muted, fontWeight: "600" },
});