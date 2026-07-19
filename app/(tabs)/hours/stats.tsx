import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { COLORS } from "@/data/constants";
import { MonthlyStatsCard } from "@/components/stats/MonthlyStatsCard";
import { ServiceYearStatsCard } from "@/components/stats/ServiceYearStatsCard";
import { TrendChart } from "@/components/stats/TrendChart";
import { PaceCard } from "@/components/stats/PaceCard";
import { ProjectionCard } from "@/components/stats/ProjectionCard";
import { HeatMap } from "@/components/HeatMap";
import { monthCellsForSY, svcYear } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import { useMemo } from "react";

export default function StatsScreen() {
  const { records, sessions } = useStore();

  const syLabel = useMemo(() => {
    const now = new Date();
    return svcYear(now.getFullYear(), now.getMonth() + 1);
  }, []);

  const syCells = useMemo(() => monthCellsForSY(records, sessions, syLabel), [records, sessions, syLabel]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Text style={styles.backText}>‹ Назад</Text>
        </Pressable>
        <Text style={styles.title}>Статистика</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <MonthlyStatsCard onPress={() => router.push(`/hours/month/${syLabel.split("–")[0]}-${String(new Date().getMonth() + 1).padStart(2, "0")}` as any)} />

        <ServiceYearStatsCard />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Тренд 12 месяцев</Text>
          <TrendChart
            height={200}
            onPressMonth={(date, value) => {
              if (value > 0) router.push(`/hours/month/${date}`);
            }}
          />
        </View>

        <PaceCard />

        <ProjectionCard />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Тепловая карта служебного года</Text>
          <HeatMap cells={syCells} granularity="month" cellSize={30} gap={4} onPressCell={(date, value) => {
            if (value > 0) router.push(`/hours/month/${date}`);
          }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  back: { paddingVertical: 6, paddingRight: 12 },
  backText: { fontSize: 15, fontWeight: "600", color: COLORS.blue },
  title: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  content: { padding: 16, paddingTop: 4, gap: 16 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
});