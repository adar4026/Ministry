import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, formatHM } from "@/data/constants";
import type { PeriodSummary } from "@/data/periodStats";
import { ChartIcon, ChevronRightIcon } from "@/components/icons";

interface PeriodOverviewCardProps {
  title: string; // «Этот месяц» / «Служебный год»
  summary: PeriodSummary;
  actionLabel: string; // «Статистика за месяц» / «Статистика за служебный год»
  onPress: () => void;
}

// Карточка обзорного экрана «Статистика» (TASK_061 §1). Только итог периода
// и строка-действие — никаких графиков, мини-графиков и KPI «нужно в
// день/неделю»: большие цифры и вся аналитика живут на детальных экранах,
// куда ведёт эта карточка.
export function PeriodOverviewCard({ title, summary, actionLabel, onPress }: PeriodOverviewCardProps) {
  const hasGoal = summary.goalHours > 0;
  const pct = hasGoal ? Math.max(0, Math.min(100, (summary.doneHours / summary.goalHours) * 100)) : 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        hasGoal
          ? `${title}: ${formatHM(summary.doneHours)} из ${formatHM(summary.goalHours)}, осталось ${formatHM(summary.remainingHours)}. ${actionLabel}`
          : `${title}: ${formatHM(summary.doneHours)}, цель не задана. ${actionLabel}`
      }
    >
      <Text style={styles.title}>{title}</Text>

      <View style={styles.totalsRow}>
        <Text style={styles.done}>{formatHM(summary.doneHours)}</Text>
        <Text style={styles.ofGoal}>{hasGoal ? `из ${formatHM(summary.goalHours)}` : "цель не задана"}</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>

      <Text style={styles.remaining}>Осталось: {hasGoal ? formatHM(summary.remainingHours) : "—"}</Text>

      <View style={styles.divider} />

      <View style={styles.actionRow}>
        <ChartIcon size={18} color={COLORS.accent} />
        <Text style={styles.actionLabel}>{actionLabel}</Text>
        <ChevronRightIcon size={16} color={COLORS.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  pressed: { opacity: 0.92 },
  title: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  totalsRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginTop: 8 },
  done: { fontSize: 32, fontWeight: "700", color: COLORS.navy, letterSpacing: -0.6 },
  ofGoal: { fontSize: 15, fontWeight: "600", color: COLORS.muted },
  track: { height: 6, borderRadius: 3, backgroundColor: COLORS.border, overflow: "hidden", marginTop: 12 },
  fill: { height: "100%", borderRadius: 3, backgroundColor: COLORS.accent },
  remaining: { fontSize: 13, fontWeight: "600", color: COLORS.muted, marginTop: 10 },
  divider: { height: 1, backgroundColor: COLORS.border, marginTop: 14 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: "700", color: COLORS.accent },
});
