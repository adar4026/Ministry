import { StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components/Badge";
import { categoryMeta } from "@/data/constants";
import { calendarElapsed, formatDateDMY, formatElapsedRu } from "@/data/dateFormat";
import type { CustomCategory, MinistryEvent } from "@/types";
import { DS } from "./tokens";
import { SummaryCard } from "./SummaryCard";

// A single ministry event as its own card (TASK_007). Vertically stacked by
// the caller. `onPress` is part of the API now so a future Event Details
// screen can wire navigation without changing this component; when omitted,
// the card is non-interactive.
//
// Layout (TASK_018): title sits on its own full-width row so it can truncate
// without contending for space with the badge; date + exact elapsed time
// sit below it; the category badge is pinned bottom-right, visually
// subordinate to title and metadata per the section's hierarchy.
export function EventCard({
  event,
  customCategories = [],
  onPress,
}: {
  event: MinistryEvent;
  // Optional/defaults to `[]` (TASK_045) — existing callers that only ever
  // rendered system-category events keep working unchanged.
  customCategories?: CustomCategory[];
  onPress?: (event: MinistryEvent) => void;
}) {
  const dotColor = categoryMeta(event.category, customCategories).dot;
  const elapsed = formatElapsedRu(calendarElapsed(event.date));
  return (
    <SummaryCard onPress={onPress ? () => onPress(event) : undefined} style={styles.card}>
      <View style={styles.titleRow}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaText}>
          <Text style={styles.date}>{formatDateDMY(event.date)}</Text>
          {elapsed ? <Text style={styles.elapsed}>{elapsed}</Text> : null}
        </View>
        <Badge category={event.category} customCategories={customCategories} />
      </View>
    </SummaryCard>
  );
}

const styles = StyleSheet.create({
  // Radius unified with the rest of the Home card system (TASK_017): no
  // override here anymore — SummaryCard's default (22) applies directly
  // (was a one-off 18 before).
  card: { padding: 14, gap: 8 },
  titleRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { flex: 1, fontSize: 16, fontWeight: "600", color: DS.navy },
  // Centered (was flex-end, TASK_027): metaText is now two stacked lines
  // instead of one, so centering keeps the badge visually balanced next to
  // the taller text block regardless of how many lines the duration wraps
  // to — badge stays in its own column, never overlapping the text.
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  // Date above duration (TASK_027, was a single row with a "·" separator).
  // No flexWrap/baseline needed anymore — each line has the full column
  // width to itself instead of sharing a row with its neighbor, so neither
  // needs special handling to avoid colliding with the other.
  metaText: { flex: 1, flexDirection: "column", gap: 2 },
  // Unified with UpcomingEventRow's date typography (TASK_025) — same
  // fontSize/fontWeight/lineHeight across both event-card designs; color
  // unchanged (DS.metaText, distinct from UpcomingEventRow's COLORS.muted).
  date: { fontSize: 14, fontWeight: "400", lineHeight: 19, color: DS.metaText },
  // Same fontSize/lineHeight as `date` (TASK_027 — owner's explicit
  // requirement: duration must read at the same size as the date, never as
  // large as the title); distinguished only by weight and the warm amber
  // accent color instead of a red that would read as an error/overdue state.
  elapsed: { fontSize: 14, fontWeight: "600", lineHeight: 19, color: DS.durationAccent },
});
