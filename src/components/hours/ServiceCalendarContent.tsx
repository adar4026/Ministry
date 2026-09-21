import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Modal } from "@/components/Modal";
import { ClockIcon } from "@/components/icons";
import { addMonths } from "@/data/calendarGrid";
import { MF, formatClockDuration, toISODate } from "@/data/constants";
import { formatHistoryListDate } from "@/data/dateFormat";
import {
  dailyMinutesForMonth,
  sessionsForDay,
  sessionsForMonth,
  sortSessionsDescending,
  totalCreditForPeriod,
  totalMinutesForPeriod,
  type HistoryPeriod,
} from "@/data/stats";
import { currentServiceYearEndYear } from "@/data/serviceYear";
import { useStore } from "@/store/StoreContext";
import type { Session } from "@/types";
import { HistoryCalendar } from "./HistoryCalendar";
import { HistorySessionRow } from "./HistorySessionRow";
import { HistoryTotalCard } from "./HistoryTotalCard";
import { LegacyMonthRow } from "./LegacyMonthRow";
import { PeriodNav } from "./PeriodNav";
import { PeriodSwitcher } from "./PeriodSwitcher";
import { useCalendarPalette, useCalendarStyles, type CalendarPalette } from "./calendarVariant";

// TASK_083 — the service calendar itself, shared by the «Часы» tab's
// /hours/history and the drawer's /calendar. This is the body History has
// had since TASK_032/033/034/038/039, moved out of the screen file
// unchanged in behaviour; the two screens only add their own header,
// background and CalendarVariantContext around it.
//
// Period switcher (Month/Year/All-time) + total card, then the calendar
// grid + flat session list for the currently *displayed* month. The
// displayed month/year (`viewYear`/`viewMonthIndex0`) is independent,
// navigable UI state — Month-period arrows move it via addMonths() (Dec/Jan
// wraparound already handled there); All-time hides/disables navigation and
// the calendar simply keeps showing the last displayed month. The
// calendar/list below always reflect viewYear/viewMonthIndex0 regardless of
// `period` — they are never service-year-scoped, only the currently
// displayed calendar month.
//
// Year-period navigation is a *separate* state, `viewServiceYear` (TASK_038)
// — it cannot reuse `viewYear`, because the two use different calendars:
// `viewYear` is a plain calendar year (for the month grid), while a service
// year runs Sep..Aug and is identified by the calendar year it *ends* in
// (see currentServiceYearEndYear() in src/data/serviceYear.ts, the
// canonical domain module — this component does not compute the boundary
// itself). These only happen to start out equal because `now` here defaults
// to the literal current moment — during Sep..Dec they diverge (e.g. now =
// October 2026: `viewYear` should default to 2026 for the month grid, but
// the *current* service year is Sep 2026..Aug 2027, ending in 2027).
// Year-period arrows move only `viewServiceYear`, leaving the displayed
// month untouched per the owner's spec, so returning to Month-period shows
// the same month again. Only the "Итого" total is period-scoped
// (totalMinutesForPeriod). Credit hours (TASK_039 — e.g. pioneer school
// attendance) get their own parallel figure, creditMinutes
// (totalCreditForPeriod), shown as a second line on the same card — the two
// numbers are never combined into one; a HourRecord with `hours: 30,
// creditHours: 30` contributes 30 to totalMinutes and 30 to creditMinutes,
// not 0 to one or 60 to the other.
//
// Tapping a day: one Session → the existing /entry editor; several → the
// picker below; a legacy month → the existing /hours/month/[key] editor.
// No second editor lives here.
export function ServiceCalendarContent() {
  const styles = useCalendarStyles(makeStyles);
  const C = useCalendarPalette();
  const { records, sessions } = useStore();

  const now = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => toISODate(now), [now]);

  const [period, setPeriod] = useState<HistoryPeriod>("month");
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonthIndex0, setViewMonthIndex0] = useState(now.getMonth());
  const [viewServiceYear, setViewServiceYear] = useState(() => currentServiceYearEndYear(now));
  const [dayPicker, setDayPicker] = useState<{ iso: string; sessions: Session[] } | null>(null);

  const dailyMinutes = useMemo(
    () => dailyMinutesForMonth(sessions, viewYear, viewMonthIndex0 + 1),
    [sessions, viewYear, viewMonthIndex0],
  );
  const monthSessions = useMemo(
    () => sortSessionsDescending(sessionsForMonth(sessions, viewYear, viewMonthIndex0 + 1)),
    [sessions, viewYear, viewMonthIndex0],
  );
  // Session-first (docs/TASKS/TASK_005_ARCHITECTURE.md §7–§8): when the
  // viewed month has zero Sessions, its legacy HourRecord (if any) is
  // authoritative — resolved here once and consumed both by the list
  // below and by the LegacyMonthRow's tap target.
  const legacyRecord = useMemo(
    () => (monthSessions.length === 0 ? records.find((r) => r.year === viewYear && r.month === viewMonthIndex0 + 1) : undefined),
    [records, monthSessions, viewYear, viewMonthIndex0],
  );
  const totalMinutes = useMemo(
    () => totalMinutesForPeriod(records, sessions, period, period === "year" ? viewServiceYear : viewYear, viewMonthIndex0 + 1),
    [records, sessions, period, viewYear, viewMonthIndex0, viewServiceYear],
  );
  // TASK_039 — credit hours get their own line on the "Итого" card, only
  // for the service-year period (that's the "итоговая карточка служебного
  // года" the credit belongs on) — never merged into totalMinutes above.
  const creditMinutes = useMemo(
    () => (period === "year" ? Math.round(totalCreditForPeriod(records, period, viewServiceYear, viewMonthIndex0 + 1) * 60) : 0),
    [records, period, viewServiceYear, viewMonthIndex0],
  );

  function handlePrev() {
    if (period === "month") {
      const next = addMonths(viewYear, viewMonthIndex0, -1);
      setViewYear(next.year);
      setViewMonthIndex0(next.monthIndex0);
    } else if (period === "year") {
      setViewServiceYear((y) => y - 1);
    }
  }

  function handleNext() {
    if (period === "month") {
      const next = addMonths(viewYear, viewMonthIndex0, 1);
      setViewYear(next.year);
      setViewMonthIndex0(next.monthIndex0);
    } else if (period === "year") {
      setViewServiceYear((y) => y + 1);
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
    <>
      <PeriodSwitcher period={period} onChange={setPeriod} />
      <PeriodNav
        period={period}
        year={period === "year" ? viewServiceYear : viewYear}
        monthIndex0={viewMonthIndex0}
        now={now}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      <HistoryTotalCard totalMinutes={totalMinutes} creditMinutes={creditMinutes} />

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

      {monthSessions.length > 0 ? (
        <View style={styles.listCard}>
          {monthSessions.map((session, i) => (
            <HistorySessionRow
              key={session.id}
              session={session}
              showDivider={i < monthSessions.length - 1}
              onPress={openSession}
            />
          ))}
        </View>
      ) : legacyRecord ? (
        <>
          <Text style={styles.legacyCaption}>Сохранён месячный итог без разбивки по дням</Text>
          <View style={styles.listCard}>
            <LegacyMonthRow
              hours={legacyRecord.hours}
              creditHours={legacyRecord.creditHours}
              onPress={() => router.push(`/hours/month/${viewYear}-${String(viewMonthIndex0 + 1).padStart(2, "0")}`)}
            />
          </View>
        </>
      ) : (
        <Text style={styles.empty}>Нет записей за этот месяц</Text>
      )}

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
    </>
  );
}

const makeStyles = (C: CalendarPalette) => StyleSheet.create({
  monthHeading: {
    fontSize: 22,
    fontWeight: "700",
    color: C.secondaryText,
    marginTop: 20,
    marginBottom: 12,
    fontFamily: C.font,
  },
  listCard: {
    backgroundColor: C.cardBackground,
    borderRadius: C.cardRadius,
    paddingHorizontal: 16,
  },
  empty: {
    fontSize: 15,
    color: C.secondaryText,
    textAlign: "center",
    marginTop: 24,
    fontFamily: C.font,
  },
  legacyCaption: {
    fontSize: 13,
    color: C.mutedText,
    marginBottom: 8,
    fontFamily: C.font,
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
  pickerDuration: { fontSize: 17, fontWeight: "700", color: C.primaryText, fontFamily: C.font },
  pickerDate: { flex: 1, textAlign: "right", fontSize: 15, fontWeight: "600", color: C.primaryText, fontFamily: C.font },
});
