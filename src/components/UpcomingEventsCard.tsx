import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { SummaryCard, UpcomingEventRow } from "@/components/dashboard";
import { COLORS, upcomingItems } from "@/data/constants";
import { useStore } from "@/store/StoreContext";

const HOME_LIMIT = 3;

// TASK_019: "Показать все" opens the dedicated /upcoming-events screen (the
// complete, unlimited list) instead of switching to the "События" tab
// (/timeline, a separate full timeline with its own search/filter/edit
// behavior that this task intentionally leaves untouched).
export function UpcomingEventsCard() {
  const { events, talks } = useStore();
  // upcomingItems() combines events + talks at the UI layer only — both
  // collections stay separate in StoreContext. Home only ever needs the
  // first 3; the dedicated screen calls the same selector with no limit.
  const items = upcomingItems(events, talks, new Date(), HOME_LIMIT);

  // Built on the same SummaryCard primitive as the rest of the Home card
  // system (TASK_017) — was a separately-styled generic `Card` (still used
  // elsewhere: forms, /add, /timeline, /hours/history), which drifted
  // slightly from the other Home cards (24px radius vs 22px).
  return (
    <SummaryCard style={styles.card}>
      {items.length === 0 ? (
        <Text style={styles.empty}>Нет предстоящих событий</Text>
      ) : (
        items.map((it, i) => (
          <UpcomingEventRow key={`${it.kind}-${it.id}`} item={it} bordered={i < items.length - 1} />
        ))
      )}

      {items.length > 0 && (
        <Pressable
          onPress={() => router.push("/upcoming-events")}
          accessibilityRole="button"
          accessibilityLabel="Показать все предстоящие события"
          style={({ pressed }) => [styles.showAll, pressed && styles.pressed]}
        >
          <Text style={styles.showAllText}>Показать все →</Text>
        </Pressable>
      )}
    </SummaryCard>
  );
}

const styles = StyleSheet.create({
  // Radius/shadow/background now come from SummaryCard's defaults
  // (TASK_017) — only the wider padding this card always had is kept here.
  card: { padding: 20 },
  empty: { fontSize: 14, color: COLORS.muted, paddingVertical: 8 },
  showAll: { marginTop: 8, alignItems: "center", paddingVertical: 6 },
  showAllText: { fontSize: 14, fontWeight: "700", color: COLORS.accent },
  pressed: { opacity: 0.7 },
});
