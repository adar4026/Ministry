import { useCallback, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/components/BackButton";
import { DS, HomeBackground } from "@/components/dashboard";
import { ChevronRightIcon } from "@/components/icons";
import { BarRows, type BarRow } from "@/components/statistics/BarRows";
import { FactRows, type FactRow } from "@/components/statistics/FactRows";
import { StatsCard } from "@/components/statistics/StatsCard";
import { StatsEmptyState } from "@/components/statistics/StatsEmptyState";
import { StatsHero } from "@/components/statistics/StatsHero";
import { StatTiles, type StatTile } from "@/components/statistics/StatTiles";
import { YearComparisonCard } from "@/components/statistics/YearComparisonCard";
import { YearSwitcher, type StatsPeriodMode } from "@/components/statistics/YearSwitcher";
import { YearTrendChart } from "@/components/statistics/YearTrendChart";
import { MF, dayWord } from "@/data/constants";
import { formatDateHuman, pluralYearsRu } from "@/data/dateFormat";
import {
  buildServiceStatsIndex,
  formatStatMinutes,
  lifetimeStats,
  monthKey,
  yearComparison,
  yearStats,
  yearSwitcherBounds,
} from "@/data/serviceStats";
import { useStore } from "@/store/StoreContext";
import { useThemedStyles } from "@/theme";

// TASK_081 — «Статистика», opened from the drawer / Profile page
// (СЛУЖЕНИЕ → Статистика). Root-Stack route like /participation and
// /appearance, so the tab bar is not mounted under it.
//
// Nothing here is stored: the screen builds one index over the store's
// `records` + `sessions` (memoized on those two arrays) and every block is a
// read over it — the year stepper never re-aggregates the raw collections.
// Order is the owner's: period → hero → «Кратко» → «Динамика» →
// «По месяцам» → «Сравнение» → «За всё время». The first thing on screen
// is the year's total; everything else unfolds below it.
export default function StatisticsScreen() {
  const styles = useThemedStyles(makeStyles);
  const { records, sessions } = useStore();
  const params = useLocalSearchParams<{ year?: string }>();
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();

  const index = useMemo(() => buildServiceStatsIndex(records, sessions), [records, sessions]);
  const bounds = useMemo(() => yearSwitcherBounds(index, now), [index, now]);

  const [mode, setMode] = useState<StatsPeriodMode>("year");
  const [year, setYear] = useState(() => {
    const y = Number(params.year);
    return Number.isInteger(y) && y > 1900 && y < 3000 ? y : currentYear;
  });
  const scrollRef = useRef<ScrollView>(null);

  const stats = useMemo(() => yearStats(index, year), [index, year]);
  const comparison = useMemo(() => yearComparison(index, year), [index, year]);
  const lifetime = useMemo(() => lifetimeStats(index), [index]);

  const changeYear = useCallback(
    (y: number) => setYear(Math.min(bounds.max, Math.max(bounds.min, y))),
    [bounds],
  );
  const showYear = useCallback(
    (y: number) => {
      setYear(y);
      setMode("year");
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    },
    [],
  );
  const showAll = useCallback(() => {
    setMode("all");
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  // «Кратко» for a year. A year recorded only as legacy monthly totals has
  // no day breakdown — say so instead of showing «0 дней».
  const yearTiles: StatTile[] = useMemo(() => {
    const hasDays = stats.activeDays > 0;
    const busiest = stats.busiestMonth;
    return [
      {
        key: "days",
        label: "Дней служения",
        value: hasDays ? String(stats.activeDays) : "—",
        sub: hasDays ? null : "нет разбивки по дням",
      },
      {
        key: "busiest",
        label: "Самый активный месяц",
        value: busiest ? MF[busiest.month - 1] : "—",
        sub: busiest ? formatStatMinutes(busiest.minutes) : null,
      },
      {
        key: "perDay",
        label: "Среднее за день служения",
        value: hasDays ? formatStatMinutes(Math.round(stats.totalMinutes / stats.activeDays)) : "—",
        sub: null,
      },
      {
        key: "months",
        label: "Месяцев с записями",
        value: `${stats.monthsWithData} из 12`,
        sub: null,
      },
    ];
  }, [stats]);

  const monthRows: BarRow[] = useMemo(
    () =>
      stats.months.map((m) => {
        const key = monthKey(year, m.month);
        return {
          key,
          label: MF[m.month - 1],
          minutes: m.minutes,
          sub: m.source === "legacy" ? "месячный итог" : null,
          onPress: m.minutes > 0 ? () => router.push(`/statistics/month/${key}` as never) : undefined,
          testID: `stats-month-${key}`,
        };
      }),
    [stats, year],
  );

  const lifetimeFacts: FactRow[] = useMemo(() => {
    const rows: FactRow[] = [];
    if (lifetime.firstDate) {
      const [y, m] = lifetime.firstDate.split("-").map(Number);
      rows.push({
        key: "first",
        label: "Первая запись",
        // A legacy month has no day — name the month, not an invented 1st.
        value: lifetime.firstDateIsExact ? formatDateHuman(lifetime.firstDate, now) : `${MF[m - 1]} ${y}`,
      });
    }
    rows.push({ key: "years", label: "Лет с данными", value: `${lifetime.yearsWithData} ${pluralYearsRu(lifetime.yearsWithData)}` });
    rows.push({
      key: "days",
      label: "Дней служения",
      value: lifetime.activeDays > 0 ? `${lifetime.activeDays} ${dayWord(lifetime.activeDays)}` : "—",
      sub: lifetime.activeDays > 0 ? null : "нет разбивки по дням",
    });
    rows.push({ key: "avg", label: "Среднее в месяц", value: formatStatMinutes(lifetime.averagePerMonthMinutes) });
    if (lifetime.busiestMonth) {
      rows.push({
        key: "busiest",
        label: "Самый активный месяц",
        value: `${MF[lifetime.busiestMonth.month - 1]} ${lifetime.busiestMonth.year}`,
        sub: formatStatMinutes(lifetime.busiestMonth.minutes),
      });
    }
    return rows;
  }, [lifetime, now]);

  const yearRows: BarRow[] = useMemo(
    () =>
      lifetime.years.map((y) => ({
        key: String(y.year),
        label: String(y.year),
        minutes: y.minutes,
        onPress: () => showYear(y.year),
        testID: `stats-year-${y.year}`,
      })),
    [lifetime, showYear],
  );

  const busiestKey = stats.busiestMonth ? monthKey(year, stats.busiestMonth.month) : null;

  return (
    <View style={styles.screen}>
      <HomeBackground />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <BackButton fallbackHref="/" background={DS.cardBg} color={DS.navy} style={styles.back} />
          <Text style={styles.title} pointerEvents="none">
            Статистика
          </Text>
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} testID="stats-scroll">
          <YearSwitcher
            mode={mode}
            year={year}
            min={bounds.min}
            max={bounds.max}
            isCurrentYear={year === currentYear}
            onModeChange={(m) => (m === "all" ? showAll() : setMode("year"))}
            onYearChange={changeYear}
          />

          {mode === "year" ? (
            !stats.hasData ? (
              <StatsEmptyState text="Записи появятся здесь после добавления времени в календарь служения." />
            ) : (
              <>
                <StatsHero
                  eyebrow={String(year)}
                  minutes={stats.totalMinutes}
                  caption="Служение за год"
                  detail={`Среднее ${formatStatMinutes(stats.averagePerMonthMinutes)} / месяц`}
                  accessibilityLabel={`${year}: ${formatStatMinutes(stats.totalMinutes)} служения за год, в среднем ${formatStatMinutes(stats.averagePerMonthMinutes)} в месяц`}
                />

                <View style={styles.section}>
                  <Text style={styles.sectionTitle} accessibilityRole="header">
                    Кратко
                  </Text>
                  <StatTiles tiles={yearTiles} />
                </View>

                <StatsCard title="Динамика">
                  <YearTrendChart key={year} months={stats.months} year={year} lastMonthIndex={year === currentYear ? now.getMonth() : 11} />
                </StatsCard>

                <StatsCard title="По месяцам" padded={false} testID="stats-months">
                  <BarRows rows={monthRows} emphasizeKey={busiestKey} />
                </StatsCard>

                {comparison && (
                  <StatsCard title="Сравнение">
                    <YearComparisonCard comparison={comparison} />
                  </StatsCard>
                )}

                <Pressable
                  onPress={showAll}
                  accessibilityRole="button"
                  accessibilityLabel="За всё время"
                  style={({ pressed }) => [styles.linkCard, pressed && styles.pressed]}
                  testID="stats-all-link"
                >
                  <View style={styles.linkText}>
                    <Text style={styles.linkTitle}>За всё время</Text>
                    <Text style={styles.linkSub}>{formatStatMinutes(lifetime.totalMinutes)} с первой записи</Text>
                  </View>
                  <ChevronRightIcon size={18} color={DS.chevron} />
                </Pressable>
              </>
            )
          ) : !lifetime.hasData ? (
            <StatsEmptyState text="Записи появятся здесь после добавления времени в календарь служения." />
          ) : (
            <>
              <StatsHero
                eyebrow="За всё время"
                minutes={lifetime.totalMinutes}
                caption="Всего служения"
                detail={`Среднее ${formatStatMinutes(lifetime.averagePerMonthMinutes)} / месяц`}
                accessibilityLabel={`За всё время: ${formatStatMinutes(lifetime.totalMinutes)} служения`}
              />

              <StatsCard title="Кратко" padded={false} testID="stats-lifetime-facts">
                <FactRows rows={lifetimeFacts} />
              </StatsCard>

              <StatsCard title="По годам" padded={false} testID="stats-years">
                <BarRows rows={yearRows} />
              </StatsCard>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.homeBase },
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, justifyContent: "center", minHeight: 52 },
  back: { position: "absolute", left: 16 },
  title: { fontSize: 20, fontWeight: "700", color: DS.navy, textAlign: "center", letterSpacing: -0.2 },
  content: { padding: 16, paddingTop: 4, gap: 14, paddingBottom: 40 },
  section: { gap: 6 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: DS.subInk,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 14,
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: DS.cardBg,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minHeight: 64,
    shadowColor: DS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  linkText: { flex: 1, gap: 2 },
  linkTitle: { fontSize: 16, fontWeight: "700", color: DS.navy },
  linkSub: { fontSize: 13, fontWeight: "500", color: DS.subInk },
  pressed: { backgroundColor: DS.pressedBg },
});
