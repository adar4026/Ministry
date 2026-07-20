import { Pressable, StyleSheet, Text, View } from "react-native";
import type { HistoryPeriod } from "@/data/stats";
import { HISTORY_COLORS as C, HISTORY_FONT_FAMILY as FONT } from "./historyTokens";

const OPTIONS: { key: HistoryPeriod; label: string }[] = [
  { key: "month", label: "Месяц" },
  { key: "year", label: "Год" },
  { key: "all", label: "Всё время" },
];

// Segmented period control for the History screen (TASK_033). Props-only —
// same pattern as HistoryCalendar.tsx: no store access, deterministic from
// `period`/`onChange` alone. Mouse and touch both go through Pressable's
// onPress, so no separate handling is needed for the two input types.
export function PeriodSwitcher({ period, onChange }: { period: HistoryPeriod; onChange: (p: HistoryPeriod) => void }) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {OPTIONS.map((opt) => {
        const active = opt.key === period;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: C.segmentTrack,
    borderRadius: 14,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: C.cardBackground,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  label: { fontSize: 14, fontWeight: "600", color: C.secondaryText, fontFamily: FONT },
  labelActive: { color: C.primaryText, fontWeight: "700" },
});
