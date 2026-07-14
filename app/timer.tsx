import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTimer } from "@/hooks/useTimer";
import { formatDateDMY, toISODate } from "@/data/constants";

export default function TimerScreen() {
  const router = useRouter();
  const { state, mode, elapsedSec, prefillMin, loaded, recoveryElapsedSec, recoveryStartedAt,
    start, pause, resume, stop, save, discard, continue: continueTimer, confirmClockRollback } = useTimer();

  const { bankedSeconds, firstStartedAt, startedAt, status } = state;

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
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>Назад</Text>
          </Pressable>
          <Text style={styles.title}>Таймер</Text>
          <View style={{ width: 50 }} />
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
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>Назад</Text>
          </Pressable>
          <Text style={styles.title}>Таймер</Text>
          <View style={{ width: 50 }} />
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
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>Назад</Text>
          </Pressable>
          <Text style={styles.title}>Таймер</Text>
          <View style={{ width: 50 }} />
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
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>Назад</Text>
          </Pressable>
          <Text style={styles.title}>Таймер</Text>
          <View style={{ width: 50 }} />
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
              <Pressable onPress={stop} style={styles.btnPrimary}>
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
    const [showSave, setShowSave] = useState(false);

    // When stop() is called from running, it transitions to paused.
    // The Stop button in running state opens the save overlay.
    // We use a ref or state to track if we just stopped and should show save.
    // For simplicity, show save overlay whenever in paused with bankedSeconds > 0
    // unless user explicitly dismissed it (Continue).

    if (showSave || (bankedSeconds > 0 && !showSave)) {
      // We'll use a local state for the save overlay
    }

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>Назад</Text>
          </Pressable>
          <Text style={styles.title}>Таймер</Text>
          <View style={{ width: 50 }} />
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backText: { fontSize: 14, fontWeight: "600", color: "#1e3a5f" },
  title: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 4, alignItems: "center" },

  // Idle
  idleCard: { width: "100%", alignItems: "center", gap: 16 },
  idleTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b", textAlign: "center" },
  idleSubtitle: { fontSize: 14, color: "#94a3b8", textAlign: "center", lineHeight: 20 },
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
  startBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Running
  runningCard: { width: "100%", alignItems: "center", gap: 12 },
  statusBadge: { fontSize: 12, fontWeight: "700", color: "#3b82f6", backgroundColor: "#dbeafe", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  timerDisplay: { fontSize: 56, fontWeight: "800", color: "#1e293b", fontFamily: "monospace", letterSpacing: 2 },
  startedLine: { fontSize: 13, color: "#94a3b8" },
  runningActions: { flexDirection: "row", gap: 12, width: "100%", marginTop: 8 },
  btnSecondary: { flex: 1, paddingVertical: 14, backgroundColor: "#f1f5f9", borderRadius: 10, alignItems: "center" },
  btnTextSecondary: { color: "#1e3a5f", fontWeight: "700", fontSize: 14 },
  btnPrimary: { flex: 1, paddingVertical: 14, backgroundColor: "#dc2626", borderRadius: 10, alignItems: "center" },
  btnTextPrimary: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Paused
  pausedCard: { width: "100%", alignItems: "center", gap: 12 },
  statusBadgePaused: { fontSize: 12, fontWeight: "700", color: "#f59e0b", backgroundColor: "#fef9c3", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pausedActions: { flexDirection: "row", gap: 12, width: "100%", marginTop: 8 },

  // Recovery / Clock rollback
  recoveryCard: { width: "100%", alignItems: "center", gap: 16 },
  recoveryTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b", textAlign: "center" },
  recoverySubtitle: { fontSize: 14, color: "#94a3b8", textAlign: "center", lineHeight: 20 },
  recoveryInfo: { width: "100%", gap: 12 },
  recoveryInfoLabel: { fontSize: 12, fontWeight: "600", color: "#3b82f6" },
  recoveryInfoValue: { fontSize: 16, fontWeight: "600", color: "#1e293b" },
  recoveryActions: { flexDirection: "column", gap: 10, width: "100%", marginTop: 8 },
  recoveryBtn: { width: "100%", paddingVertical: 14, backgroundColor: "#3b82f6", borderRadius: 10, alignItems: "center" },
  recoveryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  recoveryBtnSecondary: { width: "100%", paddingVertical: 14, backgroundColor: "#f1f5f9", borderRadius: 10, alignItems: "center" },
  recoveryBtnTextSecondary: { color: "#1e3a5f", fontWeight: "700", fontSize: 14 },
  recoveryBtnDanger: { width: "100%", paddingVertical: 14, backgroundColor: "#fee2e2", borderRadius: 10, alignItems: "center" },
  recoveryBtnTextDanger: { color: "#dc2626", fontWeight: "700", fontSize: 14 },
});
