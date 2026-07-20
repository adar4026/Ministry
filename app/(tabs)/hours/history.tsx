import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Modal } from "@/components/Modal";
import { HistoryCalendar } from "@/components/hours/HistoryCalendar";
import { HistorySessionRow } from "@/components/hours/HistorySessionRow";
import { HistoryTotalCard } from "@/components/hours/HistoryTotalCard";
import { PeriodNav } from "@/components/hours/PeriodNav";
import { PeriodSwitcher } from "@/components/hours/PeriodSwitcher";
import { HISTORY_COLORS as C, HISTORY_FONT_FAMILY as FONT } from "@/components/hours/historyTokens";
import { ChevronRightIcon, ClockIcon } from "@/components/icons";
import { addMonths } from "@/data/calendarGrid";
import { MF, formatClockDuration, toISODate } from "@/data/constants";
import { formatHistoryListDate } from "@/data/dateFormat";
import { dailyMinutesForMonth, sessionsForDay, sessionsForMonth, totalMinutesForPeriod, type HistoryPeriod } from "@/data/stats";
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

// History: period switcher (Month/Year/All-time) + total card, then the
// TASK_032 calendar grid + flat session list for the currently *displayed*
// month (TASK_033). The displayed month/year (`viewYear`/`viewMonthIndex0`)
// is independent, navigable UI state — Month-period arrows move it via
// addMonths() (Dec/Jan wraparound already handled there); Year-period
// arrows move only the year, leaving the displayed month untouched per the
// owner's spec, so returning to Month-period shows the same month again;
// All-time hides/disables navigation and the calendar simply keeps showing
// the last displayed month. Only the "Итого" total is period-scoped
// (totalMinutesForPeriod) — the calendar/list below always reflect
// viewYear/viewMonthIndex0 regardless of `period`.
export default function HistoryScreen() {
  const { sessions } = useStore();

  const now = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => toISODate(now), [now]);

  const [period, setPeriod] = useState<HistoryPeriod>("month");
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonthIndex0, setViewMonthIndex0] = useState(now.getMonth());
  const [dayPicker, setDayPicker] = useState<{ iso: string; sessions: Session[] } | null>(null);

  const dailyMinutes = useMemo(
    () => dailyMinutesForMonth(sessions, viewYear, viewMonthIndex0 + 1),
    [sessions, viewYear, viewMonthIndex0],
  );
  const monthSessions = useMemo(
    () => sortSessions(sessionsForMonth(sessions, viewYear, viewMonthIndex0 + 1)),
    [sessions, viewYear, viewMonthIndex0],
  );
  const totalMinutes = useMemo(
    () => totalMinutesForPeriod(sessions, period, viewYear, viewMonthIndex0 + 1),
    [sessions, period, viewYear, viewMonthIndex0],
  );

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/hours");
  }

  function handlePrev() {
    if (period === "month") {
      const next = addMonths(viewYear, viewMonthIndex0, -1);
      setViewYear(next.year);
      setViewMonthIndex0(next.monthIndex0);
    } else if (period === "year") {
      setViewYear((y) => y - 1);
    }
  }

  function handleNext() {
    if (period === "month") {
      const next = addMonths(viewYear, viewMonthIndex0, 1);
      setViewYear(next.year);
      setViewMonthIndex0(next.monthIndex0);
    } else if (period === "year") {
      setViewYear((y) => y + 1);
    }
  }

  function handleDayPress(iso: string) {
    const daySessions = sessionsForDay(sessions, iso);
    if (daySessions.length === 0) return;
    if (daySessions.length === 1) {
      router.push(`/entry?id=${daySessions[0].id}`);
      return;
    }
    setDayPicker({ iso, sessions: daySessions });
  }

  function openSession(id: string) {
    setDayPicker(null);
    router.push(`/entry?id=${id}`);
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
        <PeriodSwitcher period={period} onChange={setPeriod} />
        <PeriodNav
          period={period}
          year={viewYear}
          monthIndex0={viewMonthIndex0}
          now={now}
          onPrev={handlePrev}
          onNext={handleNext}
        />

        <HistoryTotalCard totalMinutes={totalMinutes} />

        <HistoryCalendar
          year={viewYear}
          monthIndex0={viewMonthIndex0}
          dailyMinutes={dailyMinutes}
          todayISO={todayISO}
          onDayPress={handleDayPress}
        />

        <Text style={styles.monthHeading}>
          {MF[viewMonthIndex0]} {viewYear}
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

      <Modal
        visible={dayPicker !== null}
        title={dayPicker ? formatHistoryListDate(dayPicker.iso) : ""}
        onClose={() => setDayPicker(null)}
      >
        {dayPicker?.sessions.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => openSession(s.id)}
            style={({ pressed }) => [styles.pickerRow, pressed && styles.pickerRowPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Запись: ${formatClockDuration(s.durationMinutes)}`}
          >
            <View style={styles.pickerIconWrap}>
              <ClockIcon size={18} color={C.secondaryText} />
            </View>
            <Text style={styles.pickerDuration}>{formatClockDuration(s.durationMinutes)}</Text>
            <Text style={styles.pickerDate}>
              {formatHistoryListDate(s.date, s.source === "timer" ? s.startTime : undefined)}
            </Text>
          </Pressable>
        ))}
      </Modal>
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
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  pickerRowPressed: { opacity: 0.6 },
  pickerIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.iconBg,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerDuration: { fontSize: 17, fontWeight: "700", color: C.primaryText, fontFamily: FONT },
  pickerDate: { flex: 1, textAlign: "right", fontSize: 15, fontWeight: "600", color: C.primaryText, fontFamily: FONT },
});
