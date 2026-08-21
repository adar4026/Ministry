import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatDateDMY } from "@/data/dateFormat";
import { eventElapsed, formatEventElapsed } from "@/data/eventElapsed";
import { TIMELINE_COLORS } from "./timelineTokens";

// The single "События"-style event/talk card (TASK_056) — content only, no
// shadow/radius/gesture chrome of its own (see StaticCardShell and
// SwipeableDeleteRow, the two wrapper variants callers choose between).
// Layout/typography is the "События" screen's original inline card
// (TASK_041/045) moved here unchanged, now shared by the Events timeline,
// Home's "Ближайшие события"/"Последние события" and /upcoming-events —
// one visual source of truth for all four.
//
// TASK_056: the relative-time line colors red for a past, non-today date —
// everywhere else (future, and today) keeps the original amber
// (`durationAccent`), same as before this task.
export function EventListCard({
  dotColor,
  title,
  date,
  metaSuffix,
  badge,
  onEdit,
  editAccessibilityLabel,
}: {
  dotColor: string;
  title: string;
  date: string; // ISO "YYYY-MM-DD"
  // Appended after the DD-MM-YYYY date on the same line — e.g. a talk's
  // "  —  Location   ·  №5". Omitted (or empty) for plain events.
  metaSuffix?: string;
  badge: ReactNode;
  onEdit?: () => void;
  editAccessibilityLabel?: string;
}) {
  const elapsed = eventElapsed(date);
  const isPast = !elapsed.isToday && !elapsed.isFuture;
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {onEdit ? (
          <Pressable
            onPress={onEdit}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={editAccessibilityLabel}
          >
            <Text style={styles.edit}>✏</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaText}>
          <Text style={styles.date}>
            {formatDateDMY(date)}
            {metaSuffix ?? ""}
          </Text>
          <Text style={[styles.elapsed, isPast && styles.elapsedPast]}>{formatEventElapsed(elapsed)}</Text>
        </View>
        {badge}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: TIMELINE_COLORS.cardBackground, padding: 14, gap: 8 },
  titleRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { flex: 1, fontSize: 16, fontWeight: "600", color: TIMELINE_COLORS.primaryText },
  edit: { fontSize: 15, color: TIMELINE_COLORS.secondaryText, paddingLeft: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  metaText: { flex: 1, flexDirection: "column", gap: 2 },
  date: { fontSize: 14, color: TIMELINE_COLORS.secondaryText },
  elapsed: { fontSize: 14, fontWeight: "600", color: TIMELINE_COLORS.durationAccent },
  elapsedPast: { color: TIMELINE_COLORS.danger },
});
