import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SummaryCard } from "@/components/dashboard";
import { COLORS, formatDateDMY, relativeDays, upcomingItems } from "@/data/constants";
import { useStore } from "@/store/StoreContext";

const LIMIT = 3;

export function UpcomingEventsCard() {
  const { events, talks } = useStore();
  // upcomingItems() combines events + talks at the UI layer only — both
  // collections stay separate in StoreContext.
  const items = upcomingItems(events, talks, new Date(), LIMIT);

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
          <View key={`${it.kind}-${it.id}`} style={[styles.row, i < items.length - 1 && styles.rowBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{it.title}</Text>
              <Text style={styles.date}>{formatDateDMY(it.date)}</Text>
            </View>
            <Text style={styles.relative}>{relativeDays(it.date)}</Text>
          </View>
        ))
      )}

      <Pressable onPress={() => router.push("/timeline")} style={({ pressed }) => [styles.showAll, pressed && styles.pressed]}>
        <Text style={styles.showAllText}>Показать все →</Text>
      </Pressable>
    </SummaryCard>
  );
}

const styles = StyleSheet.create({
  // Radius/shadow/background now come from SummaryCard's defaults
  // (TASK_017) — only the wider padding this card always had is kept here.
  card: { padding: 20 },
  empty: { fontSize: 14, color: COLORS.muted, paddingVertical: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 12, gap: 8 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemTitle: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  date: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  relative: { fontSize: 14, fontWeight: "700", color: COLORS.blue },
  showAll: { marginTop: 8, alignItems: "center", paddingVertical: 6 },
  showAllText: { fontSize: 14, fontWeight: "700", color: COLORS.accent },
  pressed: { opacity: 0.7 },
});
