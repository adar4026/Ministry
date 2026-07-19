import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, formatHM, svcYear, serviceYearAggregation } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import { useMemo } from "react";

interface ServiceYearStatsCardProps {
  onPress?: () => void;
}

export function ServiceYearStatsCard({ onPress }: ServiceYearStatsCardProps) {
  const { records, sessions } = useStore();

  const stats = useMemo(() => {
    const groups = serviceYearAggregation(records, sessions);
    const currentSY = groups[groups.length - 1];
    if (!currentSY) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Months completed in this service year so far
    const completedMonths = currentSY.months.filter((m) => {
      const isPast = m.year < currentYear || (m.year === currentYear && m.month < currentMonth);
      const isCurrent = m.year === currentYear && m.month === currentMonth;
      return isPast || isCurrent;
    });

    const monthsCompleted = completedMonths.length;
    const totalHours = completedMonths.reduce((sum, m) => sum + m.hours, 0);
    const avgHoursPerMonth = monthsCompleted > 0 ? totalHours / monthsCompleted : 0;
    const sessionMonths = completedMonths.filter((m) => m.source === "session").length;

    // Projected year-end
    const monthsInSY = 12;
    const monthsLeft = monthsInSY - monthsCompleted;
    const projectedTotal = totalHours + avgHoursPerMonth * monthsLeft;

    return {
      serviceYear: currentSY.sy,
      totalHours: currentSY.total,
      monthsCompleted,
      monthsLeft,
      avgHoursPerMonth,
      projectedTotal,
      sessionMonths,
      legacyMonths: monthsCompleted - sessionMonths,
    };
  }, [records, sessions]);

  if (!stats) return null;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Служебный год ${stats.serviceYear}: ${formatHM(stats.totalHours)} часов итого`}
    >
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Служебный год</Text>
          <Text style={styles.subtitle}>{stats.serviceYear}</Text>
        </View>
        <Text style={styles.totalHours}>{formatHM(stats.totalHours)}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.grid}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.monthsCompleted}/12</Text>
          <Text style={styles.statLabel}>Месяцев завершено</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatHM(stats.avgHoursPerMonth)}</Text>
          <Text style={styles.statLabel}>Среднее / мес.</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatHM(stats.projectedTotal)}</Text>
          <Text style={styles.statLabel}>Прогноз года</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.sourceRow}>
        <View style={styles.sourceItem}>
          <View style={[styles.sourceDot, { backgroundColor: COLORS.accent }]} />
          <Text style={styles.sourceLabel}>{stats.sessionMonths} мес. сессий</Text>
        </View>
        <View style={styles.sourceItem}>
          <View style={[styles.sourceDot, { backgroundColor: COLORS.muted }]} />
          <Text style={styles.sourceLabel}>{stats.legacyMonths} мес. легаси</Text>
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
  title: { fontSize: 19, fontWeight: "700", color: COLORS.text },
  subtitle: { fontSize: 13, fontWeight: "600", color: COLORS.muted, marginTop: 2 },
  totalHours: { fontSize: 28, fontWeight: "700", color: COLORS.navy },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  grid: { flexDirection: "row", gap: 12, marginBottom: 12 },
  stat: { flex: 1 },
  statValue: { fontSize: 23, fontWeight: "700", color: COLORS.navy, letterSpacing: -0.4 },
  statLabel: { fontSize: 12, fontWeight: "600", color: COLORS.muted, marginTop: 2 },
  sourceRow: { flexDirection: "row", justifyContent: "space-around" },
  sourceItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  sourceDot: { width: 10, height: 10, borderRadius: 5 },
  sourceLabel: { fontSize: 13, fontWeight: "600", color: COLORS.muted },
});