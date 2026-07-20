import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { COLORS } from "@/data/constants";
import { SERVICE_YEAR_MONTH_ORDER } from "@/data/serviceYear";

interface HeatMapProps {
  cells: { date: string; value: number }[];
  granularity: "month" | "day";
  cellSize?: number;
  gap?: number;
  maxValue?: number;
  onPressCell?: (date: string, value: number) => void;
}

const DEFAULT_CELL_SIZE = { month: 28, day: 24 };
const DEFAULT_GAP = 4;
const MONTHS_PER_ROW = 4;
const DAYS_PER_WEEK = 7;

function interpolateColor(
  start: [number, number, number],
  end: [number, number, number],
  factor: number
): string {
  const r = Math.round(start[0] + (end[0] - start[0]) * factor);
  const g = Math.round(start[1] + (end[1] - start[1]) * factor);
  const b = Math.round(start[2] + (end[2] - start[2]) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

const COLOR_STOPS: [number, number, number][] = [
  [219, 234, 254], // #dbeafe (light blue)
  [147, 197, 253], // #93c5fd
  [59, 130, 246],  // #3b82f6 (blue)
  [20, 184, 166],  // #14b8a6 (teal)
  [34, 197, 94],   // #22c55e (green)
];

function getColorForValue(value: number, maxValue: number): string {
  if (value === 0) return COLORS.border;
  if (maxValue === 0) return `rgb(${COLOR_STOPS[0].join(",")})`;
  const factor = Math.min(1, value / maxValue);
  const stopCount = COLOR_STOPS.length - 1;
  const stopIndex = Math.min(stopCount - 1, Math.floor(factor * stopCount));
  const localFactor = (factor * stopCount) % 1;
  return interpolateColor(COLOR_STOPS[stopIndex], COLOR_STOPS[stopIndex + 1], localFactor);
}

export type MonthGridPosition = {
  month: number; // 1-12, the calendar month this grid position represents
  cell?: { date: string; value: number };
};

// Maps the 12 fixed Sep-Aug grid positions to the supplied MonthCell (if
// any) carrying that calendar month. Matches by each cell's own encoded
// month, taken directly from its "YYYY-MM..." date string — never derives
// or reuses a single shared year across positions. This is the TASK_008
// fix for the cross-year defect: September-start-year cells and the
// following-year January-August cells were previously resolved by
// reconstructing every lookup key from one year read off the September
// cell, which silently failed to find the correct January-August entries.
export function resolveMonthGridCells(
  cells: { date: string; value: number }[],
): MonthGridPosition[] {
  return SERVICE_YEAR_MONTH_ORDER.map((month) => ({
    month,
    cell: cells.find((c) => Number(c.date.slice(5, 7)) === month),
  }));
}

export function HeatMap({
  cells,
  granularity,
  cellSize,
  gap = DEFAULT_GAP,
  maxValue,
  onPressCell,
}: HeatMapProps) {
  const size = cellSize ?? DEFAULT_CELL_SIZE[granularity];
  const max = maxValue ?? Math.max(0, ...cells.map((c) => c.value));
  const radius = 4;

  if (granularity === "month") {
    // 12 months in a 3x4 grid (Sep-Aug service year order)
    const cols = MONTHS_PER_ROW;
    const rows = 3;
    const gridPositions = resolveMonthGridCells(cells);

    return (
      <View style={styles.container}>
        {Array.from({ length: rows }).map((_, row) => (
          <View key={row} style={styles.row}>
            {Array.from({ length: cols }).map((_, col) => {
              const idx = row * cols + col;
              if (idx >= 12) return <View key={`empty-${row}-${col}`} style={{ width: size, height: size }} />;
              const { month, cell } = gridPositions[idx];
              const value = cell?.value ?? 0;
              const date = cell?.date ?? `missing-${month}`;
              const color = getColorForValue(value, max);

              return (
                <Pressable
                  key={date}
                  onPress={() => onPressCell?.(cell?.date ?? "", value)}
                  style={({ pressed }) => [
                    styles.cell,
                    { width: size, height: size, backgroundColor: color },
                    pressed && { opacity: 0.8 },
                  ]}
                  accessibilityLabel={`${month} month: ${value > 0 ? value + "h" : "no data"}`}
                >
                  {value > 0 && <Text style={styles.cellValue}>{Math.round(value)}</Text>}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  }

  // Day granularity: calendar-style grid (weeks as rows)
  if (granularity === "day") {
    if (cells.length === 0) return <View style={styles.container} />;

    const firstDate = new Date(cells[0].date);
    const year = firstDate.getFullYear();
    const month = firstDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startOffset = firstDayOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = lastDayOfMonth.getDate();

    const totalCells = startOffset + daysInMonth;
    const weeks = Math.ceil(totalCells / DAYS_PER_WEEK);

    const cellMap = new Map(cells.map((c) => [c.date, c.value]));

    return (
      <View style={styles.container}>
        {/* Weekday headers */}
        <View style={styles.weekdayRow}>
          {["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"].map((d, i) => (
            <Text key={i} style={styles.weekdayLabel}>{d}</Text>
          ))}
        </View>
        {Array.from({ length: weeks }).map((_, week) => (
          <View key={week} style={styles.row}>
            {Array.from({ length: DAYS_PER_WEEK }).map((_, day) => {
              const cellIndex = week * DAYS_PER_WEEK + day;
              const dayOfMonth = cellIndex - startOffset + 1;

              if (dayOfMonth < 1 || dayOfMonth > daysInMonth) {
                return <View key={`empty-${week}-${day}`} style={{ width: size, height: size }} />;
              }

              const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`;
              const value = cellMap.get(date) ?? 0;
              const color = getColorForValue(value, max);

              return (
                <Pressable
                  key={date}
                  onPress={() => onPressCell?.(date, value)}
                  style={({ pressed }) => [
                    styles.cell,
                    { width: size, height: size, backgroundColor: color, borderRadius: radius },
                    pressed && { opacity: 0.8 },
                  ]}
                  accessibilityLabel={`${dayOfMonth} day: ${value > 0 ? value + "h" : "no data"}`}
                >
                  {value > 0 && <Text style={styles.cellValue}>{Math.round(value)}</Text>}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  row: { flexDirection: "row", gap: DEFAULT_GAP },
  weekdayRow: { flexDirection: "row", gap: DEFAULT_GAP, marginBottom: 4 },
  weekdayLabel: {
    width: DEFAULT_CELL_SIZE.day,
    height: 16,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.muted,
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    minWidth: DEFAULT_CELL_SIZE.month,
    minHeight: DEFAULT_CELL_SIZE.month,
  },
  cellValue: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.navy,
  },
});