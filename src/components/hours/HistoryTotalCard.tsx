import { Pressable, StyleSheet, Text, View } from "react-native";
import { ShareIcon } from "@/components/icons";
import { formatDurationRu } from "@/data/constants";
import { HISTORY_COLORS as C, HISTORY_FONT_FAMILY as FONT } from "./historyTokens";

// "Итого" heading + total-time card (TASK_033). The share/export button is
// disabled — the project has no report-export mechanism yet (see
// docs/TASKS/TASK_033_HISTORY_PERIOD_FILTERS.md §3); it stays visibly
// inactive (reduced opacity, disabled prop) rather than firing a fake send.
//
// `creditMinutes` (TASK_039 — e.g. pioneer school attendance) is a fully
// separate quantity from `totalMinutes`, never added into it — the caller
// (history.tsx) computes both independently via totalMinutesForPeriod()/
// totalCreditForPeriod() (src/data/stats.ts). Shown as its own line only
// when > 0, so the card matches its usual look whenever there's no credit
// to report.
export function HistoryTotalCard({ totalMinutes, creditMinutes = 0 }: { totalMinutes: number; creditMinutes?: number }) {
  return (
    <View>
      <Text style={styles.heading}>Итого</Text>
      <View style={styles.card}>
        <View style={styles.valueWrap}>
          <Text style={styles.value} numberOfLines={2}>
            {formatDurationRu(totalMinutes)}
          </Text>
          {creditMinutes > 0 && (
            <Text style={styles.creditLine} numberOfLines={2}>
              + {formatDurationRu(creditMinutes)} кредит (не в итоге)
            </Text>
          )}
        </View>
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
  valueWrap: { flex: 1 },
  value: { fontSize: 20, fontWeight: "700", color: C.primaryText, fontFamily: FONT },
  creditLine: { fontSize: 13, fontWeight: "500", color: C.mutedText, fontFamily: FONT, marginTop: 4 },
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
