import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HistoryCalendar } from "@/components/hours/HistoryCalendar";
import { HistorySessionRow } from "@/components/hours/HistorySessionRow";
import { HISTORY_COLORS as C, HISTORY_FONT_FAMILY as FONT } from "@/components/hours/historyTokens";
import { ChevronRightIcon } from "@/components/icons";
import { MF, toISODate } from "@/data/constants";
import { dailyMinutesForMonth, sessionsForMonth } from "@/data/stats";
import { useStore } from "@/store/StoreContext";
import type { Session } from "@/types";

// Reverse-chronological order within the current month: by calendar date
// first, then — for entries on the same day — by startTime when it exists
// (source === "timer"), falling back to createdAt only as a tiebreaker
// (never shown to the user, see HistorySessionRow). Both are ISO datetime
// strings, so lexicographic comparison is chronological comparison.
function sortSessions(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    const aKey = a.startTime ?? a.createdAt;
    const bKey = b.startTime ?? b.createdAt;
    return bKey.localeCompare(aKey);
  });
}

// Current-month History: calendar grid + flat session list (TASK_032).
// Deliberately scoped to the current calendar month only — no month
// navigation, no service-year grouping, no legacy HourRecord fallback (the
// current month can never have one, see legacyEntryBlockReason() in
// src/data/constants.ts). A future task may add month switching.
export default function HistoryScreen() {
  const { sessions } = useStore();

  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const monthIndex0 = now.getMonth();
  const month = monthIndex0 + 1;
  const todayISO = useMemo(() => toISODate(now), [now]);

  const dailyMinutes = useMemo(() => dailyMinutesForMonth(sessions, year, month), [sessions, year, month]);
  const monthSessions = useMemo(
    () => sortSessions(sessionsForMonth(sessions, year, month)),
    [sessions, year, month],
  );

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/hours");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={10} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Назад">
          <ChevronRightIcon size={18} color={C.primaryText} />
        </Pressable>
        <Text style={styles.title} pointerEvents="none">
          История
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HistoryCalendar year={year} monthIndex0={monthIndex0} dailyMinutes={dailyMinutes} todayISO={todayISO} />

        <Text style={styles.monthHeading}>
          {MF[monthIndex0]} {year}
        </Text>

        {monthSessions.length === 0 ? (
          <Text style={styles.empty}>Нет записей за этот месяц</Text>
        ) : (
          <View style={styles.listCard}>
            {monthSessions.map((session, i) => (
              <HistorySessionRow key={session.id} session={session} showDivider={i < monthSessions.length - 1} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.screenBackground },
  header: {
    height: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.cardBackground,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "180deg" }],
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: C.primaryText,
    textAlign: "center",
    fontFamily: FONT,
  },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  monthHeading: {
    fontSize: 22,
    fontWeight: "700",
    color: C.secondaryText,
    marginTop: 20,
    marginBottom: 12,
    fontFamily: FONT,
  },
  listCard: {
    backgroundColor: C.cardBackground,
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  empty: {
    fontSize: 15,
    color: C.secondaryText,
    textAlign: "center",
    marginTop: 24,
    fontFamily: FONT,
  },
});
