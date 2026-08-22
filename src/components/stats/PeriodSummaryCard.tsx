import { StyleSheet, Text, View } from "react-native";
import { COLORS, formatHM } from "@/data/constants";
import type { PeriodSummary } from "@/data/periodStats";

interface PeriodSummaryCardProps {
  summary: PeriodSummary;
}

// Карточка итогов детального экрана (TASK_061 §2/§3) — только факт, цель,
// полоса и остаток. Ни «Изучений Библии», ни других типов активности
// (в модели данных проекта их нет), ни оценочных сообщений.
export function PeriodSummaryCard({ summary }: PeriodSummaryCardProps) {
  const hasGoal = summary.goalHours > 0;
  const pct = hasGoal ? Math.max(0, Math.min(100, (summary.doneHours / summary.goalHours) * 100)) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.totalsRow}>
        <Text style={styles.done}>{formatHM(summary.doneHours)}</Text>
        <Text style={styles.ofGoal}>{hasGoal ? `из ${formatHM(summary.goalHours)}` : "цель не задана"}</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>

      <Text style={styles.line}>Осталось: {hasGoal ? formatHM(summary.remainingHours) : "—"}</Text>
      <Text style={styles.line}>Цель: {hasGoal ? formatHM(summary.goalHours) : "не задана"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  totalsRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 8 },
  done: { fontSize: 34, fontWeight: "700", color: COLORS.navy, letterSpacing: -0.6 },
  ofGoal: { fontSize: 15, fontWeight: "600", color: COLORS.muted },
  track: { height: 6, borderRadius: 3, backgroundColor: COLORS.border, overflow: "hidden", marginTop: 14 },
  fill: { height: "100%", borderRadius: 3, backgroundColor: COLORS.accent },
  line: { fontSize: 13, fontWeight: "600", color: COLORS.muted, marginTop: 10 },
});
