import { StyleSheet, Text, View } from "react-native";
import { buildMonthGrid, WEEKDAYS_SHORT } from "@/data/calendarGrid";
import { MINISTRY } from "./tokens";

// TASK_073 — the publisher hero's compact month indicator: seven weekday
// letters, then the month's days as small cells. A day of service is a
// filled accent dot with the day number in white; today gets a thin primary
// ring; every other day is neutral ink. Deliberately NOT a calendar view —
// no navigation, no taps, no durations — just the month's rhythm at a
// glance, sitting on a light glass surface over the hero scene. Geometry
// comes from the shared buildMonthGrid() (Monday-first, TASK_030).
export function ParticipationMiniCalendar({
  year,
  month,
  markedDays,
  today,
}: {
  year: number;
  month: number; // 1–12
  markedDays: Set<number>;
  /** Day-of-month of today when the shown month is the current one, else undefined. */
  today?: number;
}) {
  const grid = buildMonthGrid(year, month - 1);
  return (
    <View style={styles.card} testID="participation-mini-calendar" importantForAccessibility="no-hide-descendants" aria-hidden>
      <View style={styles.row}>
        {WEEKDAYS_SHORT.map((w) => (
          <Text key={w} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>
      {grid.map((week, i) => (
        <View key={i} style={styles.row}>
          {week.map((day, j) => {
            if (day === null) return <View key={j} style={styles.cell} />;
            const marked = markedDays.has(day);
            const isToday = day === today;
            return (
              <View key={j} style={styles.cell} testID={marked ? `mini-cal-marked-${day}` : `mini-cal-day-${day}`}>
                <View style={[styles.dot, marked && styles.dotMarked, isToday && !marked && styles.dotToday, isToday && marked && styles.dotTodayMarked]}>
                  <Text style={[styles.day, marked && styles.dayMarked]}>{day}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const DOT = 26;

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.38)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.65)",
  },
  row: { flexDirection: "row" },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    color: MINISTRY.ink2,
    paddingBottom: 4,
  },
  cell: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 2 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: "center", justifyContent: "center" },
  dotMarked: { backgroundColor: MINISTRY.accent },
  dotToday: { borderWidth: 1.5, borderColor: MINISTRY.primary },
  dotTodayMarked: { borderWidth: 1.5, borderColor: "rgba(255,255,255,0.9)" },
  day: { fontSize: 12, lineHeight: 15, fontWeight: "600", color: MINISTRY.ink, fontVariant: ["tabular-nums"] },
  dayMarked: { color: "#ffffff", fontWeight: "700" },
});
