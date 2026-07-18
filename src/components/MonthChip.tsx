import { Pressable, StyleSheet, Text } from "react-native";
import { COLORS, MN, type ServiceYearMonth } from "@/data/constants";

// Compact month tile used on the dashboard's current-service-year grid.
// Renders a ServiceYearMonth ViewModel (session- or legacy-authoritative) —
// see the "Home Service-Year ViewModel" addendum in docs/TASKS/TASK_005A.md.
// Visual appearance is unchanged; only the data model feeding it changed.
export function MonthChip({
  record,
  onPress,
}: {
  record: ServiceYearMonth;
  onPress: () => void;
}) {
  // Legacy monthly totals are always whole numbers (entered by hand), but a
  // Session-authoritative month (monthTotal() = sum(durationMinutes)/60,
  // see serviceYearAggregation() in src/data/constants.ts) can land on a
  // long-tail float like 38.166666666666664 for an in-progress month. This
  // tile has always shown a bare whole number with no unit suffix — round
  // for DISPLAY ONLY here, same "round, never mutate the source" rule as
  // formatHMRounded() elsewhere; record.hours itself is untouched.
  const displayHours = Math.round(record.hours);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      <Text style={styles.month}>
        {MN[record.month - 1]} {record.year}
      </Text>
      <Text style={styles.hours}>{displayHours}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  pressed: { opacity: 0.7 },
  month: { fontSize: 10, color: COLORS.muted },
  hours: { fontSize: 15, fontWeight: "700", color: COLORS.blue },
});
