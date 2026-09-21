import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/components/BackButton";
import { DS, HomeBackground } from "@/components/dashboard";
import { Modal } from "@/components/Modal";
import { ChevronRightIcon, ClockIcon } from "@/components/icons";
import { BarRows, type BarRow } from "@/components/statistics/BarRows";
import { FactRows, type FactRow } from "@/components/statistics/FactRows";
import { StatsCard } from "@/components/statistics/StatsCard";
import { StatsHero } from "@/components/statistics/StatsHero";
import { MF, formatClockDuration } from "@/data/constants";
import { formatDateHuman, formatHistoryListDate } from "@/data/dateFormat";
import { buildServiceStatsIndex, formatStatMinutes, monthDetail } from "@/data/serviceStats";
import { sessionsForDay, sortSessionsDescending } from "@/data/stats";
import { useStore } from "@/store/StoreContext";
import type { Session } from "@/types";
import { useThemedStyles } from "@/theme";

// TASK_081 — one month of the «Статистика» section (`key` = "YYYY-MM"):
// the total, the number of service days, the average per service day, and
// the list of days with entries. A day opens the SAME thing the service
// calendar (/hours/history) opens — the session editor for a single
// session, or a picker when a day has several — there is no second editor
// here. A month kept only as a legacy monthly total has no days: it says
// so and links to the month's page in «Часы».
export default function StatisticsMonthScreen() {
  const styles = useThemedStyles(makeStyles);
  const { key } = useLocalSearchParams<{ key?: string }>();
  const { records, sessions } = useStore();
  const [dayPicker, setDayPicker] = useState<{ iso: string; sessions: Session[] } | null>(null);

  const [yearStr, monthStr] = (key ?? "").split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const valid = Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12;

  const index = useMemo(() => buildServiceStatsIndex(records, sessions), [records, sessions]);
  const detail = useMemo(() => monthDetail(index, year, month), [index, year, month]);
  // Anchor "today" inside the month's own year so the day label never
  // grows a year suffix («3 марта», not «3 марта 2025») — the year is in
  // the header already.
  const yearAnchor = useMemo(() => new Date(valid ? year : 2000, 0, 1), [valid, year]);

  const facts: FactRow[] = useMemo(
    () => [
      {
        key: "days",
        label: "Дней служения",
        value: detail.activeDays > 0 ? String(detail.activeDays) : "—",
        sub: detail.source === "legacy" ? "нет разбивки по дням" : null,
      },
      {
        key: "perDay",
        label: "Среднее за день служения",
        value: detail.activeDays > 0 ? formatStatMinutes(detail.averagePerActiveDayMinutes) : "—",
      },
    ],
    [detail],
  );

  function handleDayPress(iso: string) {
    const daySessions = sortSessionsDescending(sessionsForDay(sessions, iso));
    if (daySessions.length === 0) return;
    if (daySessions.length === 1) {
      router.push(`/entry?id=${daySessions[0].id}` as never);
      return;
    }
    setDayPicker({ iso, sessions: daySessions });
  }

  function openSession(id: string) {
    setDayPicker(null);
    router.push(`/entry?id=${id}` as never);
  }

  const dayRows: BarRow[] = useMemo(
    () =>
      detail.days.map((d) => ({
        key: d.date,
        label: formatDateHuman(d.date, yearAnchor),
        minutes: d.minutes,
        onPress: () => handleDayPress(d.date),
        testID: `stats-day-${d.date}`,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detail, yearAnchor, sessions],
  );

  if (!valid) return null;

  const periodLabel = `${MF[month - 1]} ${year}`;

  return (
    <View style={styles.screen}>
      <HomeBackground />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <BackButton fallbackHref="/statistics" background={DS.cardBg} color={DS.navy} style={styles.back} />
          <Text style={styles.title} pointerEvents="none" testID="stats-month-title">
            {periodLabel}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {detail.source === "none" ? (
            <Text style={styles.empty}>Нет записей за этот месяц</Text>
          ) : (
            <>
              <StatsHero
                eyebrow="Всего"
                minutes={detail.totalMinutes}
                caption="Служение за месяц"
                accessibilityLabel={`${periodLabel}: ${formatStatMinutes(detail.totalMinutes)}`}
              />

              <StatsCard padded={false} testID="stats-month-facts">
                <FactRows rows={facts} />
              </StatsCard>

              {detail.source === "session" ? (
                <StatsCard title="Дни служения" padded={false} testID="stats-month-days">
                  <BarRows rows={dayRows} />
                </StatsCard>
              ) : (
                <View style={styles.legacy}>
                  <Text style={styles.legacyCaption}>Сохранён месячный итог без разбивки по дням</Text>
                  <Pressable
                    onPress={() => router.push(`/hours/month/${key}` as never)}
                    accessibilityRole="button"
                    accessibilityLabel="Открыть месяц в разделе «Часы»"
                    style={({ pressed }) => [styles.linkCard, pressed && styles.pressed]}
                    testID="stats-month-legacy-link"
                  >
                    <Text style={styles.linkTitle}>Открыть месяц в разделе «Часы»</Text>
                    <ChevronRightIcon size={18} color={DS.chevron} />
                  </Pressable>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={dayPicker !== null} title={dayPicker ? formatHistoryListDate(dayPicker.iso) : ""} onClose={() => setDayPicker(null)}>
        {dayPicker?.sessions.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => openSession(s.id)}
            style={({ pressed }) => [styles.pickerRow, pressed && styles.pickerRowPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Запись: ${formatClockDuration(s.durationMinutes)}`}
            testID={`stats-day-session-${s.id}`}
          >
            <View style={styles.pickerIconWrap}>
              <ClockIcon size={18} color={DS.subInk} />
            </View>
            <Text style={styles.pickerDuration}>{formatClockDuration(s.durationMinutes)}</Text>
            <Text style={styles.pickerDate}>{formatHistoryListDate(s.date, s.source === "timer" ? s.startTime : undefined)}</Text>
          </Pressable>
        ))}
      </Modal>
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.homeBase },
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, justifyContent: "center", minHeight: 52 },
  back: { position: "absolute", left: 16 },
  title: { fontSize: 20, fontWeight: "700", color: DS.navy, textAlign: "center", letterSpacing: -0.2, paddingHorizontal: 56 },
  content: { padding: 16, paddingTop: 4, gap: 14, paddingBottom: 40 },
  empty: { fontSize: 15, color: DS.subInk, textAlign: "center", marginTop: 24 },
  legacy: { gap: 8 },
  legacyCaption: { fontSize: 13, color: DS.subInk, paddingHorizontal: 14 },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: DS.cardBg,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minHeight: 56,
  },
  linkTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: DS.navy },
  pressed: { backgroundColor: DS.pressedBg },
  pickerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  pickerRowPressed: { opacity: 0.6 },
  pickerIconWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: DS.ringTrack, alignItems: "center", justifyContent: "center" },
  pickerDuration: { fontSize: 17, fontWeight: "700", color: DS.navy },
  pickerDate: { flex: 1, textAlign: "right", fontSize: 15, fontWeight: "600", color: DS.navy },
});
