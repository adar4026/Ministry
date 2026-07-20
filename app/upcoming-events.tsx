import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/components/BackButton";
import { DS, HomeBackground, SummaryCard, UpcomingEventRow } from "@/components/dashboard";
import { upcomingItems } from "@/data/constants";
import { useStore } from "@/store/StoreContext";

// TASK_019 — dedicated screen for the complete upcoming-events list, opened
// from Home's "Ближайшие события" → "Показать все". Lives outside the
// `(tabs)` group (root Stack, like `app/service.tsx`) rather than nested
// under a tab's own Stack (the `hours/month/[key]` pattern) — see
// docs/TASKS/TASK_019_HOME_UPCOMING_EVENTS_SCREEN.md §3 for why: nesting
// under the "Главная" tab would require turning `app/(tabs)/index.tsx` into
// its own folder+_layout, a wider navigation-tree restructure this task
// avoids. Being outside `Tabs` also means the bottom tab bar (rendered only
// by the `Tabs` navigator) naturally doesn't show here — nothing to hide.
export default function UpcomingEventsScreen() {
  const { events, talks } = useStore();
  // Same shared selector as Home's preview card, called with no limit —
  // the complete future-dated list, no month/year window.
  const items = useMemo(() => upcomingItems(events, talks, new Date()), [events, talks]);

  return (
    <View style={styles.screen}>
      <HomeBackground />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <BackButton fallbackHref="/" background={DS.cardBg} color={DS.navy} style={styles.back} />
          <Text style={styles.title} pointerEvents="none">
            Ближайшие события
          </Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.homeBase },
  safe: { flex: 1 },
  header: {
    height: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  back: { position: "absolute", left: 16, zIndex: 1 },
  title: { fontSize: 18, fontWeight: "700", color: DS.navy, textAlign: "center" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 4, paddingBottom: 32 },
  // Same gap as Home's "Последние события" eventList / UpcomingEventsCard's
  // list (TASK_021) — independent per-item cards, no shared container.
  list: { gap: 11 },
  card: { padding: 20 },
  empty: { fontSize: 15, color: DS.metaText, paddingVertical: 8 },
});
