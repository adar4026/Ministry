import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, formatHM, MONTHLY_GOAL, monthProgress, trailingPace } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import { useMemo } from "react";

interface MonthlyStatsCardProps {
  onPress?: () => void;
}

export function MonthlyStatsCard({ onPress }: MonthlyStatsCardProps) {
  const { records, sessions } = useStore();

  const stats = useMemo(() => {
    const now = new Date();
    const p = monthProgress(records, now, sessions);
    const pace7 = trailingPace(sessions, 7, now);
    const pace30 = trailingPace(sessions, 30, now);
    const pace = pace7 > 0 ? pace7 : pace30;

    const pct = MONTHLY_GOAL > 0 ? Math.round((p.hoursDone / MONTHLY_GOAL) * 100) : 0;
    const statusColor = p.status === "ahead" ? COLORS.green : p.status === "behind" ? COLORS.danger : COLORS.warn;
    const statusLabel = p.status === "ahead" ? "Опережение" : p.status === "behind" ? "Отставание" : "В графике";

    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      hoursDone: p.hoursDone,
      hoursRemaining: p.hoursRemaining,
      daysLeft: p.daysLeft,
      pace,
      pace7,
      pace30,
      pct,
      statusLabel,
      statusColor,
    };
  }, [records, sessions]);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Текущий месяц: ${formatHM(stats.hoursDone)} из ${MONTHLY_GOAL} ч. ${stats.statusLabel}`}
    >
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Текущий месяц</Text>
          <Text style={[styles.subtitle, { color: stats.statusColor }]}>{stats.statusLabel} от цели</Text>
        </View>
        <View style={styles.pctWrap}>
          <Text style={[styles.pctValue, { color: stats.statusColor }]}>{stats.pct}%</Text>
          <Text style={styles.pctSub}>до цели</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.mainRow}>
        <View style={styles.bigValue}>
          <Text style={styles.hoursDone}>{formatHM(stats.hoursDone)}</Text>
          <Text style={styles.ofGoal}>/ {MONTHLY_GOAL} ч.</Text>
        </View>
        <View style={styles.chips}>
          <View style={[styles.chip, { borderColor: COLORS.green }]}>
            <Text style={styles.chipLabel}>До цели осталось</Text>
            <Text style={styles.chipValue}>
              {stats.hoursRemaining > 0 ? formatHM(stats.hoursRemaining) : "Цель достигнута"}
            </Text>
          </View>
          <View style={[styles.chip, { borderColor: COLORS.warn }]}>
            <Text style={styles.chipLabel}>Осталось дней</Text>
            <Text style={styles.chipValue}>{stats.daysLeft} дн.</Text>
          </View>
          {stats.pace > 0 && (
            <View style={[styles.chip, { borderColor: COLORS.accent }]}>
              <Text style={styles.chipLabel}>Темп (7 дн.)</Text>
              <Text style={styles.chipValue}>{formatHM(stats.pace7 / 60)} / дн.</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  pressed: { opacity: 0.9 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  titleWrap: { flex: 1 },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  subtitle: { fontSize: 12, fontWeight: "600", color: COLORS.muted, marginTop: 2 },
  pctWrap: { alignItems: "flex-end" },
  pctValue: { fontSize: 24, fontWeight: "800" },
  pctSub: { fontSize: 11, fontWeight: "600", color: COLORS.muted, marginTop: -2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  mainRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  bigValue: { flex: 1 },
  hoursDone: { fontSize: 36, fontWeight: "800", color: COLORS.navy, letterSpacing: -0.8 },
  ofGoal: { fontSize: 14, fontWeight: "600", color: COLORS.muted, marginTop: 4 },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: "center",
  },
  chipLabel: { fontSize: 10, fontWeight: "700", color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  chipValue: { fontSize: 14, fontWeight: "800", color: COLORS.navy, marginTop: 2 },
});