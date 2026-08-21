import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMemo } from "react";
import { BackButton } from "@/components/BackButton";
import { useTabBarContentInset } from "@/components/TabBar";
import { PeriodOverviewCard } from "@/components/stats/PeriodOverviewCard";
import { COLORS, MONTHLY_GOAL, YEARLY_GOAL, dayWord, svcYear } from "@/data/constants";
import {
  monthCumulativePoints,
  monthHasDailyBreakdown,
  monthPeriodSummary,
  serviceYearMonthIndex,
  yearCumulativePoints,
  yearPeriodSummary,
} from "@/data/periodStats";
import { useStore } from "@/store/StoreContext";

// TASK_037 — replaces the old MonthlyStatsCard/ServiceYearStatsCard/
// TrendChart/PaceCard/ProjectionCard/HeatMap stack with two tappable
// overview cards. HeatMap.tsx itself is not deleted — it's still used by
// hours/month/[key].tsx — only its call site on this screen is removed.
export default function StatsOverviewScreen() {
  const { records, sessions } = useStore();

  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const syLabel = useMemo(() => svcYear(year, month), [year, month]);

  const monthSummary = useMemo(() => monthPeriodSummary(records, sessions, year, month, MONTHLY_GOAL, now), [records, sessions, year, month, now]);
  const monthPoints = useMemo(
    () => (monthHasDailyBreakdown(sessions, year, month) ? monthCumulativePoints(sessions, year, month, MONTHLY_GOAL) : []),
    [sessions, year, month],
  );

  const yearSummary = useMemo(() => yearPeriodSummary(records, sessions, syLabel, YEARLY_GOAL, now), [records, sessions, syLabel, now]);
  const yearPoints = useMemo(() => yearCumulativePoints(records, sessions, syLabel, YEARLY_GOAL), [records, sessions, syLabel]);

  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const yearKey = syLabel.split("–")[0];
  // TASK_054 — clearance now lives on this ScrollView's own content instead
  // of the shared Tabs scene padding (see app/(tabs)/_layout.tsx).
  const bottomInset = useTabBarContentInset();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <BackButton fallbackHref="/hours" style={styles.backBtn} />
        <Text style={styles.title} pointerEvents="none">
          Статистика
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
        <PeriodOverviewCard
          title="Этот месяц"
          subtitle={monthKey}
          summary={monthSummary}
          points={monthPoints}
          todayIndex={now.getDate()}
          paceUnitLabel="в день"
          paceHours={monthSummary.requiredPerDay}
          daysLeftLabel={`${monthSummary.daysLeft} ${dayWord(monthSummary.daysLeft)}`}
          onPress={() => router.push(`/hours/stats/month/${monthKey}` as any)}
        />

        <PeriodOverviewCard
          title="Служебный год"
          subtitle={syLabel}
          summary={yearSummary}
          points={yearPoints}
          todayIndex={serviceYearMonthIndex(month)}
          paceUnitLabel="в неделю"
          paceHours={yearSummary.requiredPerWeek}
          daysLeftLabel={`${yearSummary.daysLeft} ${dayWord(yearSummary.daysLeft)}`}
          onPress={() => router.push(`/hours/stats/year/${yearKey}` as any)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.groupedBg },
  header: {
    height: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  backBtn: { position: "absolute", left: 16, zIndex: 1 },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
});
