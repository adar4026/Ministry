import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { MF } from "@/data/constants";
import { WheelPicker } from "@/components/WheelPicker";
import { ADD_TIME_COLORS } from "@/components/forms/entryTokens";

const MONTH_ITEMS = MF.map((label, monthIndex0) => ({ value: monthIndex0, label }));

// No existing app-wide min/max year constraint (TASK_030 §3 confirmed none
// exists — the month-grid's ‹/› arrows already navigate any month/year
// without limit). This quick-picker's range is only a shortcut convenience,
// not a hard boundary, so it's built wide enough for a real ministry
// history (`currentYear ± a few decades`, TASK_030 follow-up §9.3) and
// additionally stretched to always include whatever year is already
// displayed — a far ‹/› navigation before opening this picker must never
// produce a selection that isn't in the wheel.
const YEARS_PAST = 60;
const YEARS_FUTURE = 20;

// Two independently scrollable wheels — Russian month names and years — for
// the "Июль 2026 ▾" quick-jump inside MonthCalendarModal (TASK_030 follow-
// up §9). Changing either only updates the displayed month/year; the
// caller (MonthCalendarModal) is what decides whether/when that becomes the
// actual selected date.
export function MonthYearWheelPicker({
  monthIndex0,
  year,
  onChangeMonth,
  onChangeYear,
}: {
  monthIndex0: number;
  year: number;
  onChangeMonth: (monthIndex0: number) => void;
  onChangeYear: (year: number) => void;
}) {
  const yearItems = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const start = Math.min(currentYear - YEARS_PAST, year - 5);
    const end = Math.max(currentYear + YEARS_FUTURE, year + 5);
    return Array.from({ length: end - start + 1 }, (_, i) => {
      const y = start + i;
      return { value: y, label: String(y) };
    });
  }, [year]);

  return (
    <View style={styles.row}>
      <WheelPicker
        items={MONTH_ITEMS}
        value={monthIndex0}
        onChange={onChangeMonth}
        accessibilityLabel="Месяц"
        highlightColor={ADD_TIME_COLORS.selectedPickerRow}
      />
      <WheelPicker
        items={yearItems}
        value={year}
        onChange={onChangeYear}
        accessibilityLabel="Год"
        highlightColor={ADD_TIME_COLORS.selectedPickerRow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
});
