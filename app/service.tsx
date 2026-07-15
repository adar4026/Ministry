import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "@/data/constants";

// TASK_002 Phase 1 placeholder. Sections are wired up in Phase 2.
const SECTIONS = [
  { key: "add", label: "ÐÐ¾Ð±Ð°Ð²Ð¸ÑÑ Ð²ÑÐµÐ¼Ñ", hint: "Ð ÑÑÐ½Ð¾Ð¹ Ð²Ð²Ð¾Ð´ ÑÐ°ÑÐ¾Ð² Ð¸ Ð¼Ð¸Ð½ÑÑ" },
  { key: "timer", label: "Ð¢Ð°Ð¹Ð¼ÐµÑ", hint: "Ð¡ÑÐ°ÑÑ / Ð¿Ð°ÑÐ·Ð° / ÑÑÐ¾Ð¿" },
  { key: "history", label: "ÐÑÑÐ¾ÑÐ¸Ñ", hint: "ÐÐ°Ð¿Ð¸ÑÐ¸ Ð·Ð° ÑÐµÐºÑÑÐ¸Ð¹ Ð¼ÐµÑÑÑ" },
  { key: "stats", label: "Ð¡ÑÐ°ÑÐ¸ÑÑÐ¸ÐºÐ°", hint: "ÐÑÐ¾Ð³ÑÐµÑÑ Ð·Ð° Ð¼ÐµÑÑÑ Ð¸ ÑÐ»ÑÐ¶ÐµÐ±Ð½ÑÐ¹ Ð³Ð¾Ð´" },
] as const;

export default function ServiceScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Text style={styles.backText}>â¹ ÐÐ°Ð·Ð°Ð´</Text>
        </Pressable>
        <Text style={styles.title}>Ð¡Ð»ÑÐ¶ÐµÐ½Ð¸Ðµ</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {SECTIONS.map((s) => (
          <Pressable
            key={s.key}
            onPress={() => {
              if (s.key === "add") return router.push("/hours/entry");
              if (s.key === "history") return router.push("/hours/history");
              if (s.key === "timer") return router.push("/hours/timer");
              if (s.key === "stats") return router.push("/hours/stats");
            }}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>{s.label}</Text>
              <Text style={styles.cardHint}>{s.hint}</Text>
            </View>
            <Text style={styles.chevron}>âº</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  back: { paddingVertical: 6, paddingRight: 12 },
  backText: { fontSize: 14, fontWeight: "600", color: COLORS.blue },
  title: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  content: { padding: 16, paddingTop: 4, gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  pressed: { opacity: 0.85 },
  cardLabel: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  cardHint: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  chevron: { fontSize: 20, color: COLORS.muted, fontWeight: "600" },
});