import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SessionForm } from "@/components/forms/SessionForm";
import { COLORS } from "@/data/constants";
import { useStore } from "@/store/StoreContext";

const NOOP_STATE = { canSubmit: false, submit: () => {} };

// Manual Time Entry (TASK_005B; redesigned TASK_011) — a dedicated flat
// route, sibling of service.tsx. Create when no ?id, edit when ?id matches
// an existing Session. The Отмена/Добавить header lives here (not inside
// SessionForm) so it stays fixed above the scrollable cards; SessionForm
// reports its live validity/submit trigger up via `onStateChange`.
export default function EntryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { sessions, saveSession, deleteSession } = useStore();
  const initial = id ? sessions.find((s) => s.id === id) : undefined;
  const [formState, setFormState] = useState(NOOP_STATE);

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
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.cancel}>Отмена</Text>
        </Pressable>
        <Pressable onPress={formState.submit} disabled={!formState.canSubmit} hitSlop={10}>
          <Text style={[styles.action, !formState.canSubmit && styles.actionDisabled]}>
            {initial ? "Сохранить" : "Добавить"}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.heading}>{initial ? "Редактировать запись" : "Добавить время"}</Text>

      <ScrollView contentContainerStyle={styles.content}>
        <SessionForm
          initial={initial}
          onSave={(input) => {
            saveSession(input);
            router.back();
          }}
          onDelete={initial ? confirmDelete : undefined}
          onStateChange={setFormState}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  cancel: { fontSize: 17, fontWeight: "500", color: COLORS.muted },
  action: { fontSize: 17, fontWeight: "700", color: COLORS.blue },
  actionDisabled: { color: COLORS.muted },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  content: { padding: 16 },
});
