import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useTimer } from "@/hooks/useTimer";
import { formatElapsed } from "@/data/timer";
import { formatDateDMY, toISODate } from "@/data/constants";
import { HOURS_COLORS as C } from "./hoursTokens";

// The main visual element of the "Часы" screen (TASK_031). Embeds the
// timer directly (idle/running/paused) via the same screen-scoped
// useTimer() hook that app/(tabs)/hours/timer.tsx uses — identical
// start/pause/resume/stop/save calls, no business logic duplicated or
// changed (src/hooks/useTimer.ts and src/data/timer.ts are untouched by
// this task). The rare recovery-screen/clock-rollback states are NOT
// re-implemented here — that logic is already proven on a physical
// device (TASK_030 follow-up) inside timer.tsx, so this card just links
// out to it for those two states instead of risking a second, divergent
// implementation.
export function TimerHeroCard() {
  const {
    mode,
    elapsedSec,
    prefillMin,
    state,
    start,
    pause,
    resume,
    stop,
    save,
  } = useTimer();

  const [showSave, setShowSave] = useState(false);
  const [saveDuration, setSaveDuration] = useState(0);
  const [saveNote, setSaveNote] = useState("");

  const { firstStartedAt } = state;
  const sessionDate = firstStartedAt ? toISODate(new Date(firstStartedAt)) : toISODate(new Date());

  // Mirrors timer.tsx: prefillMin only reflects the freshly-banked time
  // AFTER the state update from stop() has committed and this component
  // re-renders — reading it synchronously inside handleStop() would still
  // see the pre-stop (running-mode, always-0) value.
  useEffect(() => {
    if (showSave) {
      setSaveDuration(prefillMin);
      setSaveNote("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSave, prefillMin]);

  function handleStop() {
    stop();
    setShowSave(true);
  }

  function handleSave() {
    if (saveDuration <= 0) return;
    const trimmedNote = saveNote.trim();
    save({ date: sessionDate, durationMinutes: saveDuration, note: trimmedNote ? trimmedNote : undefined });
    setShowSave(false);
  }

  // Recovery-screen / clock-rollback: deliberately not reimplemented here
  // (see file header) — hand off to the existing, already-verified screen.
  if (mode === "recovery-screen" || mode === "clock-rollback") {
    return (
      <View style={[styles.card, styles.attentionCard]}>
        <Text style={styles.statusLabel}>Таймер требует внимания</Text>
        <Text style={styles.attentionText}>
          Приложение было закрыто или системное время изменилось — нужно подтвердить, как продолжить.
        </Text>
        <Pressable
          onPress={() => router.push("/hours/timer" as any)}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Открыть таймер, чтобы подтвердить восстановление"
        >
          <Text style={styles.primaryBtnText}>Открыть</Text>
        </Pressable>
      </View>
    );
  }

  if (showSave && mode === "paused") {
    return (
      <View style={styles.card}>
        <Text style={styles.statusLabel}>Сохранить время</Text>
        <Text style={styles.timerDisplay}>{formatElapsed(elapsedSec)}</Text>

        <View style={styles.saveField}>
          <Text style={styles.saveLabel}>Дата</Text>
          <Text style={styles.saveValue}>{formatDateDMY(sessionDate)}</Text>
        </View>
        <View style={styles.saveField}>
          <Text style={styles.saveLabel}>Длительность (мин)</Text>
          <TextInput
            style={styles.saveInput}
            value={saveDuration > 0 ? String(saveDuration) : ""}
            onChangeText={(t) => setSaveDuration(Number(t.replace(/[^0-9]/g, "")) || 0)}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={C.tertiaryText}
            accessibilityLabel="Длительность в минутах"
          />
        </View>
        <View style={styles.saveField}>
          <Text style={styles.saveLabel}>Заметка</Text>
          <TextInput
            style={styles.saveInput}
            value={saveNote}
            onChangeText={setSaveNote}
            placeholder="Необязательно"
            placeholderTextColor={C.tertiaryText}
            accessibilityLabel="Заметка"
          />
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => setShowSave(false)}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryBtnText}>Отмена</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={saveDuration <= 0}
            style={({ pressed }) => [
              styles.primaryBtn,
              styles.flex1,
              saveDuration <= 0 && styles.disabled,
              pressed && saveDuration > 0 && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: saveDuration <= 0 }}
          >
            <Text style={styles.primaryBtnText}>Сохранить</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (mode === "idle") {
    return (
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, styles.statusDotIdle]} />
          <Text style={styles.statusLabel}>Таймер не запущен</Text>
        </View>
        <Text style={styles.timerDisplay}>0:00</Text>
        <Text style={styles.hint}>Нажмите «Старт», чтобы начать отслеживать время служения</Text>
        <Pressable
          onPress={start}
          style={({ pressed }) => [styles.primaryBtn, styles.fullWidth, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Начать служение"
        >
          <Text style={styles.primaryBtnText}>Начать служение</Text>
        </Pressable>
      </View>
    );
  }

  const isRunning = mode === "running";

  return (
    <View style={styles.card}>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, isRunning ? styles.statusDotRunning : styles.statusDotPaused]} />
        <Text style={styles.statusLabel}>{isRunning ? "Запущен" : "Пауза"}</Text>
      </View>
      <Text style={styles.timerDisplay}>{formatElapsed(elapsedSec)}</Text>
      <Text style={styles.hint}>
        Начато:{" "}
        {firstStartedAt
          ? new Date(firstStartedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "—"}
      </Text>
      <View style={styles.actionsRow}>
        {isRunning ? (
          <Pressable
            onPress={pause}
            style={({ pressed }) => [styles.secondaryBtn, styles.flex1, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Поставить на паузу"
          >
            <Text style={styles.secondaryBtnText}>Пауза</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={resume}
            style={({ pressed }) => [styles.secondaryBtn, styles.flex1, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Продолжить"
          >
            <Text style={styles.secondaryBtnText}>Продолжить</Text>
          </Pressable>
        )}
        <Pressable
          onPress={handleStop}
          style={({ pressed }) => [styles.dangerBtn, styles.flex1, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Остановить таймер"
        >
          <Text style={styles.dangerBtnText}>Стоп</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.cardBackground,
    borderRadius: 22,
    padding: 20,
    gap: 4,
  },
  attentionCard: { gap: 10 },
  attentionText: { fontSize: 14, color: C.secondaryText, lineHeight: 19 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusDotIdle: { backgroundColor: C.tertiaryText },
  statusDotRunning: { backgroundColor: "#22c55e" },
  statusDotPaused: { backgroundColor: "#f59e0b" },
  statusLabel: { fontSize: 15, fontWeight: "700", color: C.primaryText },
  timerDisplay: {
    fontSize: 52,
    fontWeight: "700",
    color: C.primaryText,
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.5,
    marginVertical: 6,
  },
  hint: { fontSize: 14, color: C.secondaryText, marginBottom: 16 },
  actionsRow: { flexDirection: "row", gap: 10 },
  flex1: { flex: 1 },
  fullWidth: { alignSelf: "stretch" },
  primaryBtn: {
    backgroundColor: C.accent,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondaryBtn: {
    backgroundColor: "#F2F2F7",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { color: C.primaryText, fontWeight: "700", fontSize: 16 },
  dangerBtn: {
    backgroundColor: "#FDECEC",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerBtnText: { color: C.danger, fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
  saveField: { gap: 6, marginBottom: 14 },
  saveLabel: { fontSize: 13, fontWeight: "600", color: C.secondaryText },
  saveValue: { fontSize: 17, fontWeight: "600", color: C.primaryText },
  saveInput: {
    borderWidth: 1,
    borderColor: C.divider,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    color: C.primaryText,
    backgroundColor: "#fff",
  },
});
