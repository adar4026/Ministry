import { StyleSheet, Text, View } from "react-native";
import { COLORS, formatDateDMY, relativeDays, type UpcomingItem } from "@/data/constants";

// One row of a combined event+talk upcoming item (TASK_007's
// UpcomingEventsCard preview, TASK_019's dedicated /upcoming-events
// screen). Presentational only — extracted so both call sites share the
// exact same row instead of duplicating this JSX/styling.
// Two stacked lines (TASK_020 follow-up): title alone on top, date (left) +
// remaining-time label (right) sharing the line below — keeps the longer
// calendar-based labels ("Через 11 месяцев 29 дней") from ever competing
// with the title for horizontal space on the same line.
export function UpcomingEventRow({ item, bordered }: { item: UpcomingItem; bordered?: boolean }) {
  return (
    <View style={[styles.row, bordered && styles.rowBorder]}>
      <Text style={styles.itemTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <View style={styles.bottomRow}>
        <Text style={styles.date}>{formatDateDMY(item.date)}</Text>
        <Text style={styles.relative}>{relativeDays(item.date)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemTitle: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 4, gap: 8 },
  date: { fontSize: 13, color: COLORS.muted },
  // Capped at 55% width so a long calendar-based label ("Через 11 месяцев
  // 29 дней") wraps onto its own second line on narrow screens instead of
  // squeezing the date on its left.
  relative: { fontSize: 14, fontWeight: "700", color: COLORS.blue, textAlign: "right", flexShrink: 1, maxWidth: "55%" },
});
