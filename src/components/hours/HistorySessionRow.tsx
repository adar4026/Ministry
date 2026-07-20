import { StyleSheet, Text, View } from "react-native";
import { ClockIcon } from "@/components/icons";
import { formatClockDuration } from "@/data/constants";
import { formatHistoryListDate } from "@/data/dateFormat";
import type { Session } from "@/types";
import { HISTORY_COLORS as C, HISTORY_FONT_FAMILY as FONT } from "./historyTokens";

// One row of the History month list (TASK_032). `startTime` is only ever
// read for source === "timer" — manual entries never had a start time
// recorded (SessionForm.tsx), so passing it through unconditionally would
// show a fabricated time of day. `createdAt` is never shown here (decided
// with the owner) — it's a save timestamp, not a ministry time.
export function HistorySessionRow({ session, showDivider }: { session: Session; showDivider: boolean }) {
  const label = formatHistoryListDate(session.date, session.source === "timer" ? session.startTime : undefined);

  return (
    <View style={[styles.row, showDivider && styles.divider]}>
      <View style={styles.iconWrap}>
        <ClockIcon size={18} color={C.secondaryText} />
      </View>
      <Text style={styles.duration}>{formatClockDuration(session.durationMinutes)}</Text>
      <Text style={styles.date}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.divider,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.iconBg,
    alignItems: "center",
    justifyContent: "center",
  },
  duration: { fontSize: 17, fontWeight: "700", color: C.primaryText, fontFamily: FONT },
  date: { flex: 1, textAlign: "right", fontSize: 15, fontWeight: "600", color: C.primaryText, fontFamily: FONT },
});
