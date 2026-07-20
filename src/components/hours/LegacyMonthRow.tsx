import { Pressable, StyleSheet, Text, View } from "react-native";
import { ClockIcon } from "@/components/icons";
import { formatHM } from "@/data/constants";
import { HISTORY_COLORS as C, HISTORY_FONT_FAMILY as FONT } from "./historyTokens";

// Legacy-month row (TASK_034) — shown in place of the Session list when the
// viewed month has zero Session and its total comes from a legacy
// HourRecord instead (Session-first rule, docs/TASKS/
// TASK_034_HISTORY_DATA_RECOVERY_AND_CRUD.md §4.2). A HourRecord is a
// monthly total, not a dated entry, so this renders one summary row (not a
// list) and opens the existing `/hours/month/[key]` editor — no id
// ambiguity to resolve, since there is at most one HourRecord per month.
export function LegacyMonthRow({ hours, onPress }: { hours: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Месячный итог: ${formatHM(hours)}, редактировать`}
    >
      <View style={styles.iconWrap}>
        <ClockIcon size={18} color={C.secondaryText} />
      </View>
      <Text style={styles.duration}>{formatHM(hours)}</Text>
      <Text style={styles.label}>Месячный итог</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  rowPressed: { opacity: 0.6 },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.iconBg,
    alignItems: "center",
    justifyContent: "center",
  },
  duration: { fontSize: 17, fontWeight: "700", color: C.primaryText, fontFamily: FONT },
  label: { flex: 1, textAlign: "right", fontSize: 15, fontWeight: "600", color: C.secondaryText, fontFamily: FONT },
});
