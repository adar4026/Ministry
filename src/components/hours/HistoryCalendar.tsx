import { StyleSheet, Text, View } from "react-native";
import { buildMonthGrid, WEEKDAYS_SHORT } from "@/data/calendarGrid";
import { formatClockDuration } from "@/data/constants";
import { HISTORY_COLORS as C, HISTORY_FONT_FAMILY as FONT } from "./historyTokens";

function isoOf(year: number, monthIndex0: number, day: number): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${year}-${p(monthIndex0 + 1)}-${p(day)}`;
}

// Pure, props-only month grid for the History screen (TASK_032). Reuses
// buildMonthGrid()/WEEKDAYS_SHORT (Monday-first, src/data/calendarGrid.ts)
// for geometry — does not reimplement calendar math or read the store.
// `dailyMinutes`/`todayISO` are computed by the caller (dailyMinutesForMonth()
// + toISODate(new Date())) so this component stays deterministic and
// testable with any fixed "today".
export function HistoryCalendar({
  year,
  monthIndex0,
  dailyMinutes,
  todayISO,
}: {
  year: number;
  monthIndex0: number;
  dailyMinutes: Map<number, number>;
  todayISO: string;
}) {
  const grid = buildMonthGrid(year, monthIndex0);

  return (
    <View>
      <View style={styles.row}>
        {WEEKDAYS_SHORT.map((w) => (
          <Text key={w} style={styles.weekday}>
            {w.toUpperCase()}
          </Text>
        ))}
      </View>

      {grid.map((week, i) => (
        <View key={i} style={styles.row}>
          {week.map((day, j) => {
            if (day === null) return <View key={j} style={styles.emptyCell} />;

            const minutes = dailyMinutes.get(day) ?? 0;
            const hasData = minutes > 0;
            const isToday = isoOf(year, monthIndex0, day) === todayISO;

            return (
              <View
                key={j}
                style={[styles.cell, hasData && styles.cellFilled]}
                accessibilityLabel={`${day}: ${formatClockDuration(minutes)}`}
              >
                <View style={[styles.dayBadge, isToday && styles.dayBadgeToday]}>
                  <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>{day}</Text>
                </View>
                <Text style={[styles.duration, hasData ? styles.durationFilled : styles.durationEmpty]}>
                  {formatClockDuration(minutes)}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, marginBottom: 6 },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: C.secondaryText,
    paddingVertical: 6,
    fontFamily: FONT,
  },
  emptyCell: {
    flex: 1,
    aspectRatio: 0.82,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.emptyCellBorder,
  },
  cell: {
    flex: 1,
    aspectRatio: 0.82,
    borderRadius: 14,
    backgroundColor: C.cardBackground,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  cellFilled: { backgroundColor: C.filledDayBg },
  dayBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 3,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBadgeToday: { backgroundColor: C.todayAccent },
  dayNumber: { fontSize: 14, fontWeight: "700", color: C.primaryText, fontFamily: FONT },
  dayNumberToday: { color: "#FFFFFF" },
  duration: { fontSize: 12, fontWeight: "700", fontFamily: FONT },
  durationFilled: { color: C.primaryText },
  durationEmpty: { color: C.mutedText },
});
