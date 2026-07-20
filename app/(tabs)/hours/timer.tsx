import { useState, useEffect } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { BackButton } from "@/components/BackButton";
import { useTimer } from "@/hooks/useTimer";
import { formatDateDMY, toISODate } from "@/data/constants";

export default function TimerScreen() {
  const { state, mode, elapsedSec, prefillMin, loaded, recoveryElapsedSec, recoveryStartedAt,
    start, pause, resume, stop, save, discard, continue: continueTimer, confirmClockRollback } = useTimer();

  const { firstStartedAt, startedAt, status } = state;

  // Local state for Save overlay in paused mode
  const [showSave, setShowSave] = useState(false);
  const [saveDuration, setSaveDuration] = useState(prefillMin);
  const [saveNote, setSaveNote] = useState("");

  // Derived: session date from timer start (not editable). firstStartedAt is
  // an ISO datetime string; toISODate expects a Date, so parse it first.
  const sessionDate = firstStartedAt ? toISODate(new Date(firstStartedAt)) : toISODate(new Date());

  // Sync saveDuration with prefillMin when overlay opens
  useEffect(() => {
    if (showSave) {
      setSaveDuration(prefillMin);
      setSaveNote("");
    }
  }, [showSave, prefillMin]);

  // Persist the timer session: convert banked time to a Session via
  // useTimer.save() (which routes through StoreContext.saveSession, ADR-003).
  // save() resets the timer to idle, so the overlay unmounts on success.
  const handleSave = () => {
    if (saveDuration <= 0) return;
    const trimmedNote = saveNote.trim();
    save({ date: sessionDate, durationMinutes: saveDuration, note: trimmedNote ? trimmedNote : undefined });
    setShowSave(false);
  };

  // Helper to format HH:MM from seconds
  const formatHM = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Idle state
  if (mode === "idle") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <BackButton fallbackHref="/hours" style={styles.unifiedBackBtn} />
          <Text style={styles.title} pointerEvents="none">Таймер</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.idleCard}>
            <Text style={styles.idleTitle}>Нет активного таймера</Text>
            <Text style={styles.idleSubtitle}>
              Нажмите «Старт», чтобы начать отслеживать время служения
            </Text>
            <Pressable onPress={start} style={styles.startBtn}>
              <Text style={styles.startBtnText}>Старт</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Recovery screen (running >= 15 min on mount)
  if (mode === "recovery-screen") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <BackButton fallbackHref="/hours" style={styles.unifiedBackBtn} />
          <Text style={styles.title} pointerEvents="none">Таймер</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.recoveryCard}>
            <Text style={styles.recoveryTitle}>Таймер работал долго</Text>
            <Text style={styles.recoverySubtitle}>
              Приложение было закрыто или в фоне более 15 минут.
              Выберите, как продолжить.
            </Text>
            <View style={styles.recoveryInfo}>
              <Text style={styles.recoveryInfoLabel}>Начало</Text>
              <Text style={styles.recoveryInfoValue}>
                {recoveryStartedAt ? formatDateDMY(recoveryStartedAt.toISOString().split("T")[0]) : "—"}
                {recoveryStartedAt ? `, ${recoveryStartedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
              </Text>
              <Text style={styles.recoveryInfoLabel}>Отслежено</Text>
              <Text style={styles.recoveryInfoValue}>{formatHM(recoveryElapsedSec ?? 0)}</Text>
            </View>
            <View style={styles.recoveryActions}>
              <Pressable onPress={continueTimer} style={styles.recoveryBtn}>
                <Text style={styles.recoveryBtnText}>Продолжить</Text>
              </Pressable>
              <Pressable onPress={stop} style={styles.recoveryBtnSecondary}>
                <Text style={styles.recoveryBtnTextSecondary}>Стоп</Text>
              </Pressable>
              <Pressable onPress={() => Alert.alert("Удалить?", "Все отслеженное время будет потеряно.", [
                { text: "Отмена", style: "cancel" },
                { text: "Удалить", style: "destructive", onPress: discard },
              ])} style={styles.recoveryBtnDanger}>
                <Text style={styles.recoveryBtnTextDanger}>Удалить</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Clock rollback screen
  if (mode === "clock-rollback") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <BackButton fallbackHref="/hours" style={styles.unifiedBackBtn} />
          <Text style={styles.title} pointerEvents="none">Таймер</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.recoveryCard}>
            <Text style={styles.recoveryTitle}>Время на устройстве изменилось</Text>
            <Text style={styles.recoverySubtitle}>
              Системные часы были переведены назад. Текущее отслеженное время:
              <Text style={styles.recoveryInfoValue}> {formatHM(recoveryElapsedSec ?? 0)}</Text>
              Продолжить?
            </Text>
            <View style={styles.recoveryActions}>
              <Pressable onPress={confirmClockRollback} style={styles.recoveryBtn}>
                <Text style={styles.recoveryBtnText}>Продолжить</Text>
              </Pressable>
              <Pressable onPress={discard} style={styles.recoveryBtnDanger}>
                <Text style={styles.recoveryBtnTextDanger}>Удалить</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Running state
  if (mode === "running") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <BackButton fallbackHref="/hours" style={styles.unifiedBackBtn} />
          <Text style={styles.title} pointerEvents="none">Таймер</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.runningCard}>
            <Text style={styles.statusBadge}>Запущен</Text>
            <Text style={styles.timerDisplay}>{formatHM(elapsedSec)}</Text>
            <Text style={styles.startedLine}>
              Начато: {firstStartedAt ? new Date(firstStartedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
            </Text>
            <View style={styles.runningActions}>
              <Pressable onPress={pause} style={styles.btnSecondary}>
                <Text style={styles.btnTextSecondary}>Пауза</Text>
              </Pressable>
              <Pressable onPress={() => { stop(); setShowSave(true); }} style={styles.btnPrimary}>
                <Text style={styles.btnTextPrimary}>Стоп</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Paused state (with optional Save overlay)
  if (mode === "paused") {
    // Save overlay: shown over the paused state after Stop (see
    // docs/TASKS/TASK_005_ARCHITECTURE.md §6 — conversion to durationMinutes
    // happens exactly once, here at Save, never at Pause).
    if (showSave) {
      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.overlayHeader}>
            <Pressable onPress={() => setShowSave(false)} style={styles.backBtn}>
              <Text style={styles.backText}>Назад</Text>
            </Pressable>
            <Text style={styles.title}>Сохранить</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <View style={styles.pausedCard}>
              <Text style={styles.timerDisplay}>{formatHM(elapsedSec)}</Text>
              <View style={styles.saveField}>
                <Text style={styles.saveLabel}>Дата</Text>
                <Text style={styles.saveDateValue}>{formatDateDMY(sessionDate)}</Text>
              </View>
              <View style={styles.saveField}>
                <Text style={styles.saveLabel}>Длительность (мин)</Text>
                <TextInput
                  style={styles.saveInput}
                  value={saveDuration > 0 ? String(saveDuration) : ""}
                  onChangeText={(t) => setSaveDuration(Number(t.replace(/[^0-9]/g, "")) || 0)}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>
              <View style={styles.saveField}>
                <Text style={styles.saveLabel}>Заметка</Text>
                <TextInput
                  style={styles.saveInput}
                  value={saveNote}
                  onChangeText={setSaveNote}
                  placeholder="Необязательно"
                />
              </View>
              <View style={styles.pausedActions}>
                <Pressable onPress={() => setShowSave(false)} style={styles.btnSecondary}>
                  <Text style={styles.btnTextSecondary}>Отмена</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  style={[styles.btnPrimary, saveDuration <= 0 && styles.btnDisabled]}
                  disabled={saveDuration <= 0}
                >
                  <Text style={styles.btnTextPrimary}>Сохранить</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <BackButton fallbackHref="/hours" style={styles.unifiedBackBtn} />
          <Text style={styles.title} pointerEvents="none">Таймер</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.pausedCard}>
            <Text style={styles.statusBadgePaused}>Пауза</Text>
            <Text style={styles.timerDisplay}>{formatHM(elapsedSec)}</Text>
            <Text style={styles.startedLine}>
              Начато: {firstStartedAt ? new Date(firstStartedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
            </Text>
            <View style={styles.pausedActions}>
              <Pressable onPress={resume} style={styles.btnPrimary}>
                <Text style={styles.btnTextPrimary}>Продолжить</Text>
              </Pressable>
              <Pressable onPress={() => { stop(); setShowSave(true); }} style={styles.btnSecondary}>
                <Text style={styles.btnTextSecondary}>Стоп</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    height: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  unifiedBackBtn: { position: "absolute", left: 16, zIndex: 1 },
  // Retained for the Save-overlay's own "Назад" (cancel-the-overlay, not
  // app navigation — see BackButton usage note above) — not converted.
  overlayHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backText: { fontSize: 15, fontWeight: "600", color: "#1e3a5f" },
  title: { fontSize: 17, fontWeight: "700", color: "#1e293b", textAlign: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 4, alignItems: "center" },

  // Idle
  idleCard: { width: "100%", alignItems: "center", gap: 16 },
  idleTitle: { fontSize: 19, fontWeight: "700", color: "#1e293b", textAlign: "center" },
  idleSubtitle: { fontSize: 15, color: "#94a3b8", textAlign: "center", lineHeight: 21 },
  startBtn: {
    width: "100%",
    paddingVertical: 16,
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  startBtnText: { color: "#fff", fontWeight: "700", fontSize: 17 },

  // Running
  runningCard: { width: "100%", alignItems: "center", gap: 12 },
  statusBadge: { fontSize: 13, fontWeight: "700", color: "#3b82f6", backgroundColor: "#dbeafe", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  timerDisplay: { fontSize: 56, fontWeight: "700", color: "#1e293b", fontFamily: "monospace", letterSpacing: 2 },
  startedLine: { fontSize: 14, color: "#94a3b8" },
  runningActions: { flexDirection: "row", gap: 12, width: "100%", marginTop: 8 },
  btnSecondary: { flex: 1, paddingVertical: 14, backgroundColor: "#f1f5f9", borderRadius: 10, alignItems: "center" },
  btnTextSecondary: { color: "#1e3a5f", fontWeight: "700", fontSize: 15 },
  btnPrimary: { flex: 1, paddingVertical: 14, backgroundColor: "#dc2626", borderRadius: 10, alignItems: "center" },
  btnTextPrimary: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Paused
  pausedCard: { width: "100%", alignItems: "center", gap: 12 },
  statusBadgePaused: { fontSize: 13, fontWeight: "700", color: "#f59e0b", backgroundColor: "#fef9c3", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pausedActions: { flexDirection: "row", gap: 12, width: "100%", marginTop: 8 },

  // Save overlay
  saveField: { width: "100%", gap: 6, marginTop: 4 },
  saveLabel: { fontSize: 13, fontWeight: "600", color: "#3b82f6" },
  saveDateValue: { fontSize: 17, fontWeight: "600", color: "#1e293b" },
  saveInput: { width: "100%", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 17, color: "#1e293b", backgroundColor: "#fff" },
  btnDisabled: { opacity: 0.5 },

  // Recovery / Clock rollback
  recoveryCard: { width: "100%", alignItems: "center", gap: 16 },
  recoveryTitle: { fontSize: 19, fontWeight: "700", color: "#1e293b", textAlign: "center" },
  recoverySubtitle: { fontSize: 15, color: "#94a3b8", textAlign: "center", lineHeight: 21 },
  recoveryInfo: { width: "100%", gap: 12 },
  recoveryInfoLabel: { fontSize: 13, fontWeight: "600", color: "#3b82f6" },
  recoveryInfoValue: { fontSize: 17, fontWeight: "600", color: "#1e293b" },
  recoveryActions: { flexDirection: "column", gap: 10, width: "100%", marginTop: 8 },
  recoveryBtn: { width: "100%", paddingVertical: 14, backgroundColor: "#3b82f6", borderRadius: 10, alignItems: "center" },
  recoveryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  recoveryBtnSecondary: { width: "100%", paddingVertical: 14, backgroundColor: "#f1f5f9", borderRadius: 10, alignItems: "center" },
  recoveryBtnTextSecondary: { color: "#1e3a5f", fontWeight: "700", fontSize: 15 },
  recoveryBtnDanger: { width: "100%", paddingVertical: 14, backgroundColor: "#fee2e2", borderRadius: 10, alignItems: "center" },
  recoveryBtnTextDanger: { color: "#dc2626", fontWeight: "700", fontSize: 15 },
});
