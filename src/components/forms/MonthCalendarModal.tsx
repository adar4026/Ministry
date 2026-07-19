import { useEffect, useState } from "react";
import { Modal as RNModal, Pressable, StyleSheet, Text, View } from "react-native";
import { MF, toISODate } from "@/data/constants";
import { buildMonthGrid, addMonths, WEEKDAYS_SHORT } from "@/data/calendarGrid";
import { ADD_TIME_COLORS } from "@/components/forms/entryTokens";
import { COLORS } from "@/data/constants";

function isoOf(year: number, monthIndex0: number, day: number): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${year}-${p(monthIndex0 + 1)}-${p(day)}`;
}

function parseISO(iso: string): { year: number; monthIndex0: number; day: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) {
    const now = new Date();
    return { year: now.getFullYear(), monthIndex0: now.getMonth(), day: now.getDate() };
  }
  return { year: Number(m[1]), monthIndex0: Number(m[2]) - 1, day: Number(m[3]) };
}

// Full-month calendar overlay for the "Добавить время" date picker
// (TASK_030). Russian, Monday-first weeks, no date library — grid math
// lives in the pure src/data/calendarGrid.ts. Same technique as the
// shared src/components/Modal.tsx (RN Modal, transparent, backdrop, centered
// sheet) but its own component: the shared Modal's title-bar-with-✕ chrome
// doesn't match this screen's month-header + ‹/› reference layout.
export function MonthCalendarModal({
  visible,
  selectedDate,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedDate: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
}) {
  const selected = parseISO(selectedDate);
  const [view, setView] = useState({ year: selected.year, monthIndex0: selected.monthIndex0 });

  // Re-center the visible month on the currently selected date every time
  // the calendar opens (not while it stays open — a mid-session month
  // navigation shouldn't snap back on its own).
  useEffect(() => {
    if (visible) setView({ year: selected.year, monthIndex0: selected.monthIndex0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const grid = buildMonthGrid(view.year, view.monthIndex0);
  const todayISO = toISODate(new Date());

  function goMonth(delta: number) {
    setView((v) => addMonths(v.year, v.monthIndex0, delta));
  }

  function pick(day: number) {
    onSelect(isoOf(view.year, view.monthIndex0, day));
  }

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.monthLabel}>
              {MF[view.monthIndex0]} {view.year}
            </Text>
            <View style={styles.navGroup}>
              <Pressable
                onPress={() => goMonth(-1)}
                hitSlop={10}
                style={styles.navBtn}
                accessibilityRole="button"
                accessibilityLabel="Предыдущий месяц"
              >
                <Text style={styles.navArrow}>‹</Text>
              </Pressable>
              <Pressable
                onPress={() => goMonth(1)}
                hitSlop={10}
                style={styles.navBtn}
                accessibilityRole="button"
                accessibilityLabel="Следующий месяц"
              >
                <Text style={styles.navArrow}>›</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS_SHORT.map((w) => (
              <Text key={w} style={styles.weekday}>
                {w}
              </Text>
            ))}
          </View>

          {grid.map((week, i) => (
            <View key={i} style={styles.weekRow}>
              {week.map((day, j) => {
                if (day === null) return <View key={j} style={styles.cell} />;
                const iso = isoOf(view.year, view.monthIndex0, day);
                const isSelected = iso === selectedDate;
                const isToday = iso === todayISO;
                return (
                  <Pressable
                    key={j}
                    style={styles.cell}
                    onPress={() => pick(day)}
                    accessibilityRole="button"
                    accessibilityLabel={`${day} ${MF[view.monthIndex0]} ${view.year}`}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        isSelected && styles.dayCircleSelected,
                        isToday && !isSelected && styles.dayCircleToday,
                      ]}
                    >
                      <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const CELL = 40;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    padding: 16,
  },
  sheet: {
    backgroundColor: ADD_TIME_COLORS.cardBackground,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  monthLabel: { fontSize: 18, fontWeight: "700", color: ADD_TIME_COLORS.primaryText },
  navGroup: { flexDirection: "row", gap: 8 },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  navArrow: { fontSize: 20, fontWeight: "700", color: COLORS.accent },
  weekRow: { flexDirection: "row" },
  weekday: {
    width: CELL,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    color: ADD_TIME_COLORS.secondaryText,
    paddingVertical: 6,
  },
  cell: {
    width: CELL,
    height: CELL,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSelected: { backgroundColor: COLORS.accent },
  dayCircleToday: { borderWidth: 1.5, borderColor: COLORS.accent },
  dayText: { fontSize: 16, fontWeight: "600", color: ADD_TIME_COLORS.primaryText },
  dayTextSelected: { color: "#FFFFFF" },
});
