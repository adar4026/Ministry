import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SessionForm } from "@/components/forms/SessionForm";
import { COLORS } from "@/data/constants";
import { useStore } from "@/store/StoreContext";

// Manual Time Entry (TASK_005B) — a dedicated flat route, sibling of
// service.tsx, reusing its header style. Create when no ?id, edit when
// ?id matches an existing Session.
export default function EntryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { sessions, saveSession, deleteSession } = useStore();
  const initial = id ? sessions.find((s) => s.id === id) : undefined;

  function confirmDelete() {
    if (!initial) return;
    Alert.alert("Удалить запись?", "Это действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          deleteSession(initial.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Text style={styles.backText}>‹ Назад</Text>
        </Pressable>
        <Text style={styles.title}>{initial ? "Редактировать запись" : "Добавить время"}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <SessionForm
          initial={initial}
          onSave={(input) => {
            saveSession(input);
            router.back();
          }}
          onDelete={initial ? confirmDelete : undefined}
        />
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
  content: { padding: 16 },
});
