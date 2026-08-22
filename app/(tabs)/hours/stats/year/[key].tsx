import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { BackButton } from "@/components/BackButton";
import { useTabBarContentInset } from "@/components/TabBar";
import { PeriodChartCard } from "@/components/stats/PeriodChartCard";
import { PeriodSummaryCard } from "@/components/stats/PeriodSummaryCard";
import { COLORS, YEARLY_GOAL, formatHM } from "@/data/constants";
import { yearChartSeries } from "@/data/periodChart";
import { periodStatusLabel, yearPeriodSummary } from "@/data/periodStats";
import { useStore } from "@/store/StoreContext";

// TASK_061 §3 — отдельный экран статистики одного служебного года.
// `key` — календарный год начала служебного года ("2025" → "2025–2026");
// сама граница Сен 1 … Авг 31 берётся из src/data/serviceYear.ts и здесь
// никогда не подменяется календарным годом.
export default function YearStatsScreen() {
  const { key } = useLocalSearchParams<{ key?: string }>();
  const { records, sessions } = useStore();

  const startYear = parseInt(key ?? "", 10);
  const valid = Number.isFinite(startYear);
  const syLabel = `${startYear}–${startYear + 1}`;

  const now = useMemo(() => new Date(), []);
  const summary = useMemo(() => yearPeriodSummary(records, sessions, syLabel, YEARLY_GOAL, now), [records, sessions, syLabel, now]);
  const series = useMemo(() => yearChartSeries(records, sessions, syLabel, YEARLY_GOAL, now), [records, sessions, syLabel, now]);
  // TASK_054 — clearance now lives on this ScrollView's own content instead
  // of the shared Tabs scene padding (see app/(tabs)/_layout.tsx).
  const bottomInset = useTabBarContentInset();

  if (!valid) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <BackButton fallbackHref="/hours/stats" style={styles.backBtn} />
        <View style={styles.headerTitles} pointerEvents="none">
          <Text style={styles.headerTitle}>Статистика за служебный год</Text>
          <Text style={styles.headerSubtitle}>{syLabel}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
        <PeriodSummaryCard summary={summary} />

        <PeriodChartCard
          title="Динамика служебного года"
          series={series}
          // Сотни дневных точек — маркеры на каждой записи превратили бы
          // линию в пунктир из кружков (TASK_061 §3).
          showMarkers={false}
          accessibilityLabel={`Динамика служебного года, ${syLabel}. Факт ${formatHM(summary.doneHours)} из ${formatHM(summary.goalHours)}. ${periodStatusLabel(summary)}`}
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
