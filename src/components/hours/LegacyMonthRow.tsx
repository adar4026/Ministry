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
//
// `hours` is the record's real total — never includes credit (TASK_039:
// creditHours is a fully separate field, not a portion of `hours`, so there
// is nothing to subtract here). `creditHours`, when > 0, is shown as a
// second line underneath so the credit stays visible without being counted
// toward this row's own number or the "Итого" card above it. Real-world
// example this shape is built for: November 2025 has `hours: 30,
// creditHours: 30` (30 real field-service hours, plus a separate 30-hour
// pioneer-school credit) — this row reads "30 ч" / "+30 ч кредит", not
// "60 ч" and not "0 ч".
export function LegacyMonthRow({
  hours,
  creditHours,
  onPress,
}: {
  hours: number;
  creditHours?: number;
  onPress: () => void;
}) {
  const hasCredit = (creditHours ?? 0) > 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={
        hasCredit
          ? `Месячный итог: ${formatHM(hours)}, плюс ${formatHM(creditHours as number)} кредита, редактировать`
          : `Месячный итог: ${formatHM(hours)}, редактировать`
      }
    >
      <View style={styles.iconWrap}>
        <ClockIcon size={18} color={C.secondaryText} />
      </View>
      <View style={styles.durationWrap}>
        <Text style={styles.duration}>{formatHM(hours)}</Text>
        {hasCredit && <Text style={styles.creditCaption}>+{formatHM(creditHours as number)} кредит</Text>}
      </View>
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
  durationWrap: { flexShrink: 1 },
  duration: { fontSize: 17, fontWeight: "700", color: C.primaryText, fontFamily: FONT },
  creditCaption: { fontSize: 12, fontWeight: "500", color: C.mutedText, fontFamily: FONT, marginTop: 1 },
  label: { flex: 1, textAlign: "right", fontSize: 15, fontWeight: "600", color: C.secondaryText, fontFamily: FONT },
});
