import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMemo } from "react";
import { BackButton } from "@/components/BackButton";
import { useTabBarContentInset } from "@/components/TabBar";
import { PeriodOverviewCard } from "@/components/stats/PeriodOverviewCard";
import { COLORS, MONTHLY_GOAL, YEARLY_GOAL, svcYear } from "@/data/constants";
import { monthPeriodSummary, yearPeriodSummary } from "@/data/periodStats";
import { useStore } from "@/store/StoreContext";

// TASK_061 §1 — «Статистика» это короткий экран-обзор: две карточки итогов
// и ничего больше. Большие графики (и любые мини-графики) живут только на
// детальных экранах /hours/stats/month/[key] и /hours/stats/year/[key],
// куда ведут сами карточки.
export default function StatsOverviewScreen() {
  const { records, sessions } = useStore();

  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const syLabel = useMemo(() => svcYear(year, month), [year, month]);

  const monthSummary = useMemo(
    () => monthPeriodSummary(records, sessions, year, month, MONTHLY_GOAL, now),
    [records, sessions, year, month, now],
  );
  const yearSummary = useMemo(() => yearPeriodSummary(records, sessions, syLabel, YEARLY_GOAL, now), [records, sessions, syLabel, now]);

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
          summary={monthSummary}
          actionLabel="Статистика за месяц"
          onPress={() => router.push(`/hours/stats/month/${monthKey}` as any)}
        />

        <PeriodOverviewCard
          title="Служебный год"
          summary={yearSummary}
          actionLabel="Статистика за служебный год"
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
