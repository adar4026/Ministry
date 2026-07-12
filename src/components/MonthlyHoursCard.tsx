import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/data/constants";

export function MonthlyHoursCard({
  monthLabel,
  hours,
  goal,
  onPress,
}: {
  monthLabel: string;
  hours: number;
  goal: number;
  onPress: () => void;
}) {
  const pct = Math.min(100, Math.round((hours / goal) * 100));
  const remaining = Math.max(0, goal - hours);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.headRow}>
        <View>
          <Text style={styles.label}>Часы в этом месяце</Text>
          <Text style={styles.month}>{monthLabel}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>

      <View style={styles.statRow}>
        <Text style={styles.hours}>{hours} ч.</Text>
        <Text style={styles.goal}>цель: {goal} ч.</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>

      <Text style={styles.remaining}>
        {remaining > 0 ? `Осталось: ${remaining} ч.` : "Цель достигнута"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  pressed: { opacity: 0.85 },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  label: { fontSize: 11, color: COLORS.muted },
  month: { fontSize: 13, fontWeight: "700", color: COLORS.text, marginTop: 2 },
  chevron: { fontSize: 20, color: COLORS.muted, fontWeight: "600" },
  statRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 12 },
  hours: { fontSize: 24, fontWeight: "800", color: COLORS.blue },
  goal: { fontSize: 12, color: COLORS.muted },
  track: { backgroundColor: "#f1f5f9", borderRadius: 6, height: 8, overflow: "hidden", marginTop: 10 },
  fill: { height: "100%", borderRadius: 6, backgroundColor: COLORS.accent },
  remaining: { fontSize: 11, color: COLORS.muted, marginTop: 8 },
});
