import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, dayWord, formatHM } from "@/data/constants";
import { periodStatusLabel, type CumulativePoint, type PeriodSummary } from "@/data/periodStats";
import { ChevronRightIcon } from "@/components/icons";
import { CumulativeChart } from "./CumulativeChart";

interface PeriodOverviewCardProps {
  title: string; // "Этот месяц" / "Служебный год"
  subtitle: string; // "Июль 2026" / "2025–2026"
  summary: PeriodSummary;
  points: CumulativePoint[];
  todayIndex: number | null;
  paceUnitLabel: string; // "/ день" or "/ нед."
  paceHours: number; // requiredPerDay or requiredPerWeek, caller picks which
  daysLeftLabel: string; // pre-formatted "12 дней" (dayWord varies by period length)
  onPress: () => void;
}

// Единая карточка обзора периода (TASK_037 §2.1/§2.2) — используется и для
// «Этот месяц», и для «Служебный год»; различаются только переданные
// значения (заголовок/подзаголовок/цель/график), не структура карточки.
export function PeriodOverviewCard({
  title,
  subtitle,
  summary,
  points,
  todayIndex,
  paceUnitLabel,
  paceHours,
  daysLeftLabel,
  onPress,
}: PeriodOverviewCardProps) {
  const pctRaw = summary.goalHours > 0 ? (summary.doneHours / summary.goalHours) * 100 : 0;
  const pctDisplay = Math.max(0, Math.min(100, pctRaw)); // bar is visually capped; underlying numbers are not
  const statusColor =
    summary.status === "ahead" || summary.status === "completed"
      ? COLORS.green
      : summary.status === "behind"
        ? COLORS.danger
        : COLORS.muted;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${formatHM(summary.doneHours)} из ${formatHM(summary.goalHours)}. ${periodStatusLabel(summary)}`}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <ChevronRightIcon size={16} color={COLORS.muted} />
      </View>
      <Text style={styles.totals}>
        {formatHM(summary.doneHours)} <Text style={styles.totalsMuted}>· из {formatHM(summary.goalHours)}</Text>
      </Text>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pctDisplay}%`, backgroundColor: statusColor }]} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{summary.status === "no-goal" ? "—" : formatHM(summary.remainingHours)}</Text>
          <Text style={styles.statLabel}>Осталось</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{daysLeftLabel}</Text>
          <Text style={styles.statLabel}>Осталось</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{summary.status === "no-goal" || summary.daysLeft === 0 ? "—" : `${formatHM(paceHours)}`}</Text>
          <Text style={styles.statLabel}>Нужно {paceUnitLabel}</Text>
        </View>
      </View>

      <CumulativeChart points={points} height={64} compact todayIndex={todayIndex} />

      <Text style={[styles.status, { color: statusColor }]}>{periodStatusLabel(summary)}</Text>
    </Pressable>
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
  pressed: { opacity: 0.92 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  title: { fontSize: 19, fontWeight: "700", color: COLORS.text },
  totals: { fontSize: 28, fontWeight: "700", color: COLORS.navy, letterSpacing: -0.5, marginBottom: 12 },
  totalsMuted: { fontSize: 15, fontWeight: "600", color: COLORS.muted },
  track: { height: 6, borderRadius: 3, backgroundColor: COLORS.border, overflow: "hidden", marginBottom: 14 },
  fill: { height: "100%", borderRadius: 3 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  statCol: { flex: 1, alignItems: "flex-start" },
  statValue: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  statLabel: { fontSize: 11, fontWeight: "600", color: COLORS.muted, marginTop: 2 },
  status: { fontSize: 13, fontWeight: "700", marginTop: 10 },
});
