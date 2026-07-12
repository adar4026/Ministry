import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, SectionTitle } from "@/components/ui";
import { COLORS, formatDateDMY, relativeDays, upcomingItems } from "@/data/constants";
import { useStore } from "@/store/StoreContext";

const LIMIT = 3;

export function UpcomingEventsCard() {
  const { events, talks } = useStore();
  // upcomingItems() combines events + talks at the UI layer only — both
  // collections stay separate in StoreContext.
  const items = upcomingItems(events, talks, new Date(), LIMIT);

  return (
    <Card>
      <SectionTitle>Ближайшие события</SectionTitle>

      {items.length === 0 ? (
        <Text style={styles.empty}>Нет предстоящих событий</Text>
      ) : (
        items.map((it, i) => (
          <View key={`${it.kind}-${it.id}`} style={[styles.row, i < items.length - 1 && styles.rowBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{it.title}</Text>
              <Text style={styles.date}>{formatDateDMY(it.date)}</Text>
            </View>
            <Text style={styles.relative}>{relativeDays(it.date)}</Text>
          </View>
        ))
      )}

      <Pressable onPress={() => router.push("/timeline")} style={({ pressed }) => [styles.showAll, pressed && styles.pressed]}>
        <Text style={styles.showAllText}>Показать все →</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 12, color: COLORS.muted, paddingVertical: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 10, gap: 8 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  date: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  relative: { fontSize: 12, fontWeight: "700", color: COLORS.blue },
  showAll: { marginTop: 8, alignItems: "center", paddingVertical: 6 },
  showAllText: { fontSize: 12, fontWeight: "700", color: COLORS.accent },
  pressed: { opacity: 0.7 },
});
