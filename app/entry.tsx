import { useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SessionForm } from "@/components/forms/SessionForm";
import { ADD_TIME_COLORS } from "@/components/forms/entryTokens";
import { useStore } from "@/store/StoreContext";

const NOOP_STATE = { canSubmit: false, submit: () => {} };

// Manual Time Entry (TASK_005B; redesigned TASK_011). Root-level route
// (`/entry`, moved out of `(tabs)/hours` in the TASK_030 follow-up) — living
// outside the `Tabs` navigator, same pattern as `upcoming-events.tsx`
// (TASK_019), means the bottom tab bar naturally isn't mounted underneath
// this screen; nothing to hide. Create when no ?id, edit when ?id matches
// an existing Session. The Отмена/Добавить header lives here (not inside
// SessionForm) so it stays fixed above the scrollable cards; SessionForm
// reports its live validity/submit trigger up via `onStateChange`.
export default function EntryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { sessions, saveSession, deleteSession } = useStore();
  const initial = id ? sessions.find((s) => s.id === id) : undefined;
  const [formState, setFormState] = useState(NOOP_STATE);
  // A ref (not state) so a second rapid press within the same tick — before
  // React has re-rendered the disabled button — is still blocked; `submit()`
  // itself has no such guard (it just checks the current duration).
  const submittedRef = useRef(false);

  function handleSubmitPress() {
    if (submittedRef.current || !formState.canSubmit) return;
    submittedRef.current = true;
    formState.submit();
  }

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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => [styles.capsuleBtn, pressed && styles.capsulePressed]}
          >
            <Text style={styles.capsuleText}>Отмена</Text>
          </Pressable>
          <Pressable
            onPress={handleSubmitPress}
            disabled={!formState.canSubmit}
            hitSlop={10}
            style={({ pressed }) => [
              styles.capsuleBtn,
              !formState.canSubmit && styles.capsuleDisabled,
              pressed && formState.canSubmit && styles.capsulePressed,
            ]}
          >
            <Text style={styles.capsuleText}>{initial ? "Сохранить" : "Добавить"}</Text>
          </Pressable>
        </View>
        <Text style={styles.heading}>{initial ? "Редактировать запись" : "Добавить время"}</Text>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ADD_TIME_COLORS.screenBackground },
  flex: { flex: 1 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  capsuleBtn: {
    borderWidth: 1.5,
    borderColor: ADD_TIME_COLORS.primaryText,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ADD_TIME_COLORS.cardBackground,
  },
  capsulePressed: { opacity: 0.6 },
  capsuleDisabled: { opacity: 0.35 },
  capsuleText: {
    fontSize: 16,
    fontWeight: "700",
    color: ADD_TIME_COLORS.primaryText,
    textDecorationLine: "underline",
  },
  heading: {
    fontSize: 34,
    fontWeight: "700",
    color: ADD_TIME_COLORS.primaryText,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  content: { padding: 16, paddingBottom: 32 },
});
