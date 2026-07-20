import { Pressable, StyleSheet, Text, View } from "react-native";
import { ShareIcon } from "@/components/icons";
import { formatDurationRu } from "@/data/constants";
import { HISTORY_COLORS as C, HISTORY_FONT_FAMILY as FONT } from "./historyTokens";

// "Итого" heading + total-time card (TASK_033). The share/export button is
// disabled — the project has no report-export mechanism yet (see
// docs/TASKS/TASK_033_HISTORY_PERIOD_FILTERS.md §3); it stays visibly
// inactive (reduced opacity, disabled prop) rather than firing a fake send.
export function HistoryTotalCard({ totalMinutes }: { totalMinutes: number }) {
  return (
    <View>
      <Text style={styles.heading}>Итого</Text>
      <View style={styles.card}>
        <Text style={styles.value} numberOfLines={2}>
          {formatDurationRu(totalMinutes)}
        </Text>
        <Pressable
          disabled
          style={styles.shareBtn}
          accessibilityRole="button"
          accessibilityLabel="Поделиться отчётом"
          accessibilityState={{ disabled: true }}
        >
          <ShareIcon size={20} color={C.mutedText} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 20, fontWeight: "700", color: C.primaryText, marginTop: 20, marginBottom: 10, fontFamily: FONT },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.cardBackground,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  value: { flex: 1, fontSize: 20, fontWeight: "700", color: C.primaryText, fontFamily: FONT },
  shareBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.iconBg,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.5,
  },
});
