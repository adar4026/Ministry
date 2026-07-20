import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { BackButton } from "@/components/BackButton";
import { CumulativeChart } from "@/components/stats/CumulativeChart";
import { COLORS, YEARLY_GOAL, dayWord, formatHM, svcYear } from "@/data/constants";
import { periodStatusLabel, serviceYearMonthIndex, yearCumulativePoints, yearPeriodSummary } from "@/data/periodStats";
import { useStore } from "@/store/StoreContext";

// TASK_037 §4 — detail screen for one service year, opened from the
// overview's "Служебный год" card. `key` is the service year's start
// calendar year (e.g. "2025" for "2025–2026") — not hard-wired to the
// current service year.
export default function YearStatsScreen() {
  const { key } = useLocalSearchParams<{ key?: string }>();
  const { records, sessions } = useStore();

  if (!key) return null;
  const startYear = parseInt(key, 10);
  if (!startYear) return null;
  const syLabel = `${startYear}–${startYear + 1}`;

  const now = useMemo(() => new Date(), []);
  const summary = useMemo(() => yearPeriodSummary(records, sessions, syLabel, YEARLY_GOAL, now), [records, sessions, syLabel, now]);
  const points = useMemo(() => yearCumulativePoints(records, sessions, syLabel, YEARLY_GOAL), [records, sessions, syLabel]);
  const current = svcYear(now.getFullYear(), now.getMonth() + 1) === syLabel;

  const pctRaw = summary.goalHours > 0 ? (summary.doneHours / summary.goalHours) * 100 : 0;
  const pctDisplay = Math.max(0, Math.min(100, pctRaw));
  const statusColor =
    summary.status === "ahead" || summary.status === "completed" ? COLORS.green : summary.status === "behind" ? COLORS.danger : COLORS.muted;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <BackButton fallbackHref="/hours/stats" style={styles.backBtn} />
        <Text style={styles.headerTitle} pointerEvents="none">
          {syLabel}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.total}>{formatHM(summary.doneHours)}</Text>
          <Text style={styles.ofGoal}>из {formatHM(summary.goalHours)}</Text>

          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pctDisplay}%`, backgroundColor: statusColor }]} />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{summary.status === "no-goal" ? "—" : formatHM(summary.remainingHours)}</Text>
              <Text style={styles.statLabel}>Осталось до цели</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>
                {summary.daysLeft} {dayWord(summary.daysLeft)}
              </Text>
              <Text style={styles.statLabel}>Осталось дней</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{summary.status === "no-goal" || summary.daysLeft === 0 ? "—" : formatHM(summary.requiredPerWeek)}</Text>
              <Text style={styles.statLabel}>Нужно в неделю</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Прогресс года</Text>

          <CumulativeChart points={points} height={200} todayIndex={current ? serviceYearMonthIndex(now.getMonth() + 1) : null} showAllMarkers />
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.accent }]} />
              <Text style={styles.legendLabel}>Фактически</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDash, { backgroundColor: COLORS.muted }]} />
              <Text style={styles.legendLabel}>План</Text>
            </View>
          </View>

          <Text style={[styles.status, { color: statusColor }]}>{periodStatusLabel(summary)}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.groupedBg },
  header: { height: 48, justifyContent: "center", paddingHorizontal: 16 },
  backBtn: { position: "absolute", left: 16, zIndex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: COLORS.text, textAlign: "center" },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 16 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  total: { fontSize: 34, fontWeight: "700", color: COLORS.navy, letterSpacing: -0.6 },
  ofGoal: { fontSize: 15, fontWeight: "600", color: COLORS.muted, marginTop: 2, marginBottom: 14 },
  track: { height: 6, borderRadius: 3, backgroundColor: COLORS.border, overflow: "hidden", marginBottom: 16 },
  fill: { height: "100%", borderRadius: 3 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCol: { flex: 1 },
  statValue: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  statLabel: { fontSize: 11, fontWeight: "600", color: COLORS.muted, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
  legend: { flexDirection: "row", gap: 16, justifyContent: "center", marginTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendDash: { width: 12, height: 2, borderRadius: 1 },
  legendLabel: { fontSize: 12, fontWeight: "600", color: COLORS.muted },
  status: { fontSize: 14, fontWeight: "700", marginTop: 14, textAlign: "center" },
});
