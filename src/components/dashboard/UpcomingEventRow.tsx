import { StyleSheet, Text, View } from "react-native";
import { COLORS, formatDateDMY, relativeDays, type UpcomingItem } from "@/data/constants";

// One row of a combined event+talk upcoming item (TASK_007's
// UpcomingEventsCard preview, TASK_019's dedicated /upcoming-events
// screen). Presentational only — extracted so both call sites share the
// exact same row instead of duplicating this JSX/styling.
export function UpcomingEventRow({ item, bordered }: { item: UpcomingItem; bordered?: boolean }) {
  return (
    <View style={[styles.row, bordered && styles.rowBorder]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.date}>{formatDateDMY(item.date)}</Text>
      </View>
      <Text style={styles.relative}>{relativeDays(item.date)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 12, gap: 8 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemTitle: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  date: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  relative: { fontSize: 14, fontWeight: "700", color: COLORS.blue },
});
