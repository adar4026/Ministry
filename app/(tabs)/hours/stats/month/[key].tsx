import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { BackButton } from "@/components/BackButton";
import { CumulativeChart } from "@/components/stats/CumulativeChart";
import { COLORS, MF, MONTHLY_GOAL, dayWord, formatHM, isCurrentMonth } from "@/data/constants";
import { monthCumulativePoints, monthHasDailyBreakdown, monthPeriodSummary, periodStatusLabel } from "@/data/periodStats";
import { useStore } from "@/store/StoreContext";

// TASK_037 §3 — detail screen for one calendar month, opened from the
// overview's "Этот месяц" card (or, in the future, from anywhere else that
// passes a `key`) — not hard-wired to "the current month".
export default function MonthStatsScreen() {
  const { key } = useLocalSearchParams<{ key?: string }>();
  const { records, sessions } = useStore();

  if (!key) return null;
  const [yearStr, monthStr] = key.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (!year || !month) return null;

  const now = useMemo(() => new Date(), []);
  const summary = useMemo(() => monthPeriodSummary(records, sessions, year, month, MONTHLY_GOAL, now), [records, sessions, year, month, now]);
  const hasDaily = useMemo(() => monthHasDailyBreakdown(sessions, year, month), [sessions, year, month]);
  const points = useMemo(() => (hasDaily ? monthCumulativePoints(sessions, year, month, MONTHLY_GOAL) : []), [hasDaily, sessions, year, month]);
  const current = isCurrentMonth(year, month, now);

  const pctRaw = summary.goalHours > 0 ? (summary.doneHours / summary.goalHours) * 100 : 0;
  const pctDisplay = Math.max(0, Math.min(100, pctRaw));
  const statusColor =
    summary.status === "ahead" || summary.status === "completed" ? COLORS.green : summary.status === "behind" ? COLORS.danger : COLORS.muted;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <BackButton fallbackHref="/hours/stats" style={styles.backBtn} />
        <Text style={styles.headerTitle} pointerEvents="none">
          {`${MF[month - 1]} ${year}`}
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
              <Text style={styles.statValue}>{summary.status === "no-goal" || summary.daysLeft === 0 ? "—" : formatHM(summary.requiredPerDay)}</Text>
              <Text style={styles.statLabel}>Нужно в день</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Прогресс месяца</Text>

          {hasDaily ? (
            <>
              <CumulativeChart points={points} height={200} todayIndex={current ? now.getDate() : null} />
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
            </>
          ) : (
            <Text style={styles.legacyNotice}>
              Сохранён месячный итог без разбивки по дням — график недоступен для этого месяца.
            </Text>
          )}

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
  legacyNotice: { fontSize: 14, color: COLORS.muted, textAlign: "center", paddingVertical: 24 },
  status: { fontSize: 14, fontWeight: "700", marginTop: 14, textAlign: "center" },
});
