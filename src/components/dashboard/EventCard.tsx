import { StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components/Badge";
import { CAT } from "@/data/constants";
import type { MinistryEvent } from "@/types";
import { DS } from "./tokens";
import { SummaryCard } from "./SummaryCard";

// A single ministry event as its own card (TASK_007). Vertically stacked by
// the caller. `onPress` is part of the API now so a future Event Details
// screen can wire navigation without changing this component; when omitted,
// the card is non-interactive.
export function EventCard({
  event,
  onPress,
}: {
  event: MinistryEvent;
  onPress?: (event: MinistryEvent) => void;
}) {
  const dotColor = (CAT[event.category] ?? CAT.other).dot;
  return (
    <SummaryCard onPress={onPress ? () => onPress(event) : undefined} style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={styles.date}>{event.date}</Text>
        </View>
        <Badge category={event.category} />
      </View>
    </SummaryCard>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 14 },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: "600", color: DS.navy },
  date: { fontSize: 12, color: DS.metaText, marginTop: 2 },
});
