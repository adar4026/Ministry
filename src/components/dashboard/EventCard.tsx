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
          <Text style={styles.date} numberOfLines={1}>
            {formatDateDMY(event.date)}
            {elapsed ? `  ·  ${elapsed}` : ""}
          </Text>
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
  metaText: { flex: 1 },
  date: { fontSize: 13, color: DS.metaText },
});
