import { router } from "expo-router";
import { Fragment } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SummaryCard, UpcomingEventRow } from "@/components/dashboard";
import { COLORS, upcomingItems } from "@/data/constants";
import { DS } from "@/components/dashboard";
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

  // Independent cards (TASK_021): each item is now its own SummaryCard (see
  // UpcomingEventRow), stacked with a small gap instead of sharing one
  // outer card separated by divider lines — matches "Последние события".
  // The empty state keeps its own single card (nothing to separate).
  return (
    <Fragment>
      {items.length === 0 ? (
        <SummaryCard style={styles.card}>
          <Text style={styles.empty}>Нет предстоящих событий</Text>
        </SummaryCard>
      ) : (
        <View style={styles.list}>
          {items.map((it) => (
            <UpcomingEventRow key={`${it.kind}-${it.id}`} item={it} />
          ))}
        </View>
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
    </Fragment>
  );
}

const styles = StyleSheet.create({
  // Same gap as "Последние события"'s eventList (app/(tabs)/index.tsx).
  list: { gap: 10 },
  // Radius/shadow/background come from SummaryCard's defaults (TASK_017) —
  // only the wider padding this card always had is kept here.
  card: { padding: 16 },
  empty: { fontSize: 15, color: COLORS.muted, paddingVertical: 8 },
  showAll: { marginTop: 4, alignItems: "center", paddingVertical: 6 },
  // DS.accentInk (TASK_048): COLORS.accent measured 3.26:1 against the Home
  // background this link sits on.
  showAllText: { fontSize: 15, fontWeight: "700", color: DS.accentInk },
  pressed: { opacity: 0.7 },
});
