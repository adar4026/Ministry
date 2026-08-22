import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { BackButton } from "@/components/BackButton";
import { useTabBarContentInset } from "@/components/TabBar";
import { PeriodChartCard } from "@/components/stats/PeriodChartCard";
import { PeriodSummaryCard } from "@/components/stats/PeriodSummaryCard";
import { COLORS, MF, MONTHLY_GOAL, formatHM } from "@/data/constants";
import { monthChartSeries } from "@/data/periodChart";
import { monthPeriodSummary, periodStatusLabel } from "@/data/periodStats";
import { useStore } from "@/store/StoreContext";

// TASK_061 §2 — отдельный экран статистики одного календарного месяца.
// Период задаётся маршрутом (`key` = "YYYY-MM"), а не собственным
// селектором: второй параллельный механизм выбора месяца/года в приложении
// не заводится, экран открывается уже с нужным периодом.
export default function MonthStatsScreen() {
  const { key } = useLocalSearchParams<{ key?: string }>();
  const { records, sessions } = useStore();

  const [yearStr, monthStr] = (key ?? "").split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const valid = Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12;

  const now = useMemo(() => new Date(), []);
  const summary = useMemo(
    () => monthPeriodSummary(records, sessions, year, month, MONTHLY_GOAL, now),
    [records, sessions, year, month, now],
  );
  const series = useMemo(
    () => monthChartSeries(records, sessions, year, month, MONTHLY_GOAL, now),
    [records, sessions, year, month, now],
  );
  // TASK_054 — clearance now lives on this ScrollView's own content instead
  // of the shared Tabs scene padding (see app/(tabs)/_layout.tsx).
  const bottomInset = useTabBarContentInset();

  if (!valid) return null;

  const periodLabel = `${MF[month - 1]} ${year}`;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <BackButton fallbackHref="/hours/stats" style={styles.backBtn} />
        <View style={styles.headerTitles} pointerEvents="none">
          <Text style={styles.headerTitle}>Статистика за месяц</Text>
          <Text style={styles.headerSubtitle}>{periodLabel}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
        <PeriodSummaryCard summary={summary} />

        <PeriodChartCard
          title="Динамика часов"
          series={series}
          accessibilityLabel={`Динамика часов, ${periodLabel}. Факт ${formatHM(summary.doneHours)} из ${formatHM(summary.goalHours)}. ${periodStatusLabel(summary)}`}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.groupedBg },
  header: { minHeight: 52, justifyContent: "center", paddingHorizontal: 16, paddingVertical: 4 },
  backBtn: { position: "absolute", left: 16, zIndex: 1 },
  headerTitles: { alignItems: "center", paddingHorizontal: 56 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text, textAlign: "center" },
  headerSubtitle: { fontSize: 12, fontWeight: "600", color: COLORS.muted, textAlign: "center", marginTop: 2 },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
});
