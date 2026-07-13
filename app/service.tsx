import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "@/data/constants";

// TASK_002 Phase 1 placeholder. Sections are wired up in Phase 2.
const SECTIONS = [
  { key: "add", label: "Добавить время", hint: "Ручной ввод часов и минут" },
  { key: "timer", label: "Таймер", hint: "Старт / пауза / стоп" },
  { key: "history", label: "История", hint: "Записи за текущий месяц" },
  { key: "stats", label: "Статистика", hint: "Прогресс за месяц и служебный год" },
] as const;

export default function ServiceScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Text style={styles.backText}>‹ Назад</Text>
        </Pressable>
        <Text style={styles.title}>Служение</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {SECTIONS.map((s) => (
          <Pressable
            key={s.key}
            onPress={() => {
              if (s.key === "add") return router.push("/entry");
              if (s.key === "history") return router.push("/history");
              Alert.alert(s.label, "Появится в Фазе 2");
            }}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>{s.label}</Text>
              <Text style={styles.cardHint}>{s.hint}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
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
