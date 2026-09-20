import { Pressable, StyleSheet, Text, View } from "react-native";
import { CheckIcon } from "@/components/icons";
import { HISTORY_COLORS as C, HISTORY_FONT_FAMILY as FONT } from "@/components/hours/historyTokens";
import { MINISTRY } from "@/components/dashboard/tokens";
import { formatDayShortRu } from "@/data/participation";
import type { ServiceParticipation } from "@/types";

// TASK_073 — one row of the participation journal:
//
//   ✓  20 сентября                              Служил
//
// Same card/row geometry as HistorySessionRow (History screen tokens) so
// the publisher's journal reuses the Hours screen's visual structure
// instead of a new list design. Tapping a row lets the user move the date
// or delete the mark (ParticipationSheet in edit mode).
export function ParticipationRow({
  item,
  showDivider,
  onPress,
  todayISO,
}: {
  item: ServiceParticipation;
  showDivider: boolean;
  onPress?: (item: ServiceParticipation) => void;
  todayISO?: string;
}) {
  const label = formatDayShortRu(item.date, todayISO);
  return (
    <Pressable
      onPress={onPress ? () => onPress(item) : undefined}
      style={({ pressed }) => [styles.row, showDivider && styles.divider, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${label}, служил. Изменить или удалить`}
      testID={`participation-row-${item.date}`}
    >
      <View style={styles.iconWrap}>
        <CheckIcon size={16} color="#fff" />
      </View>
      <Text style={styles.date}>{label}</Text>
      <Text style={styles.status}>Служил</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },
  pressed: { opacity: 0.6 },
  iconWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: MINISTRY.accent, alignItems: "center", justifyContent: "center" },
  date: { flex: 1, fontSize: 17, fontWeight: "700", color: C.primaryText, fontFamily: FONT },
  status: { fontSize: 15, fontWeight: "600", color: MINISTRY.primary, fontFamily: FONT },
});
