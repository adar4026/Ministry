import { Pressable, StyleSheet, Text } from "react-native";
import { COLORS, MN } from "@/data/constants";
import type { HourRecord } from "@/types";

// Compact month tile used on the dashboard's current-service-year grid.
export function MonthChip({
  record,
  onPress,
}: {
  record: HourRecord;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      <Text style={styles.month}>
        {MN[record.month - 1]} {record.year}
      </Text>
      <Text style={styles.hours}>{record.hours}</Text>
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
