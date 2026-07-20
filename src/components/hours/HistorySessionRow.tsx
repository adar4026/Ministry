import { Pressable, StyleSheet, Text, View } from "react-native";
import { ClockIcon } from "@/components/icons";
import { formatClockDuration } from "@/data/constants";
import { formatHistoryListDate } from "@/data/dateFormat";
import type { Session } from "@/types";
import { HISTORY_COLORS as C, HISTORY_FONT_FAMILY as FONT } from "./historyTokens";

// One row of the History month list (TASK_032; made pressable in TASK_034).
// `startTime` is only ever read for source === "timer" — manual entries
// never had a start time recorded (SessionForm.tsx), so passing it through
// unconditionally would show a fabricated time of day. `createdAt` is never
// shown here (decided with the owner) — it's a save timestamp, not a
// ministry time.
//
// `onPress` receives the row's own `session.id` — with same-day/same-
// duration entries a legal, non-rare state (TASK_032 already tested two
// sessions on one day), the id is the only stable way to know which record
// was tapped; date/duration alone cannot disambiguate.
//
// `note` (TASK_035): rendered trimmed (whitespace-only counts as absent),
// second line, capped at 2 lines with ellipsis. `marginLeft: 42` matches
// iconWrap width + topLine gap so the note starts under the duration, not
// under the icon.
export function HistorySessionRow({
  session,
  showDivider,
  onPress,
}: {
  session: Session;
  showDivider: boolean;
  onPress?: (id: string) => void;
}) {
  const label = formatHistoryListDate(session.date, session.source === "timer" ? session.startTime : undefined);
  const note = session.note?.trim();
  const notePreview = note && note.length > 60 ? `${note.slice(0, 60)}…` : note;
  const a11yLabel = notePreview
    ? `Запись ${formatClockDuration(session.durationMinutes)}, ${label}, заметка: ${notePreview}`
    : `Запись ${formatClockDuration(session.durationMinutes)}, ${label}`;

  return (
    <Pressable
      onPress={() => onPress?.(session.id)}
      style={({ pressed }) => [styles.row, showDivider && styles.divider, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
    >
      <View style={styles.topLine}>
        <View style={styles.iconWrap}>
          <ClockIcon size={18} color={C.secondaryText} />
        </View>
        <Text style={styles.duration}>{formatClockDuration(session.durationMinutes)}</Text>
        <Text style={styles.date}>{label}</Text>
      </View>
      {note ? (
        <Text style={styles.note} numberOfLines={2} ellipsizeMode="tail">
          {note}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "column",
    paddingVertical: 14,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.divider,
  },
  rowPressed: { opacity: 0.6 },
  topLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  note: {
    marginLeft: 42,
    marginTop: 4,
    fontSize: 13,
    fontWeight: "400",
    color: C.secondaryText,
    textAlign: "left",
    fontFamily: FONT,
  },
});
