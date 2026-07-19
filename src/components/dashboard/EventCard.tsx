import { StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components/Badge";
import { CAT } from "@/data/constants";
import { calendarElapsed, formatDateDMY, formatElapsedRu } from "@/data/dateFormat";
import type { MinistryEvent } from "@/types";
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
  onPress,
}: {
  event: MinistryEvent;
  onPress?: (event: MinistryEvent) => void;
}) {
  const dotColor = (CAT[event.category] ?? CAT.other).dot;
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
          {elapsed ? <Text style={styles.elapsed}>{` · ${elapsed}`}</Text> : null}
        </View>
        <Badge category={event.category} />
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
  metaRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 },
  // Row of two Text siblings (not one sentence-wrapped Text) so they behave
  // as flex items (TASK_025 follow-up — fixes 320px overflow with a 3-unit
  // duration like "10 г. 10 мес. 10 дн." alongside a long badge label):
  // RN's default flexShrink:0 keeps each Text at its natural width instead
  // of being compressed into an internal line-break, so when both don't fit
  // on one line, "flexWrap: wrap" moves the whole elapsed Text (its own
  // leading "·") down to a second line as one atomic unit — the date is
  // never split, and neither Text ever needs an ellipsis. Fits on one line
  // whenever there's room (confirmed at 375/428px).
  metaText: { flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "baseline" },
  // Unified with UpcomingEventRow's date typography (TASK_025) — same
  // fontSize/fontWeight/lineHeight across both event-card designs; color
  // unchanged (DS.metaText, distinct from UpcomingEventRow's COLORS.muted).
  date: { fontSize: 14, fontWeight: "400", lineHeight: 19, color: DS.metaText },
  // Duration after "·" stays visually more compact than the date itself
  // (TASK_025) — same color, smaller size; own Text node so it can wrap to
  // a second line independently of the date.
  elapsed: { fontSize: 13, color: DS.metaText },
});
