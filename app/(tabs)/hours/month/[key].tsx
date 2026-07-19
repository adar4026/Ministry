import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Modal } from "@/components/Modal";
import { HeatMap } from "@/components/HeatMap";
import { MonthHeader } from "@/components/MonthHeader";
import { RecordForm } from "@/components/forms/RecordForm";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import {
  COLORS,
  formatHM,
  formatDateDMY,
  MF,
  MONTHLY_GOAL,
  monthTotal,
  sessionsForMonth,
  svcYear,
  toISODate,
} from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import type { HourRecord, Session } from "@/types";

export default function MonthDetailsScreen() {
  const { key } = useLocalSearchParams<{ key?: string }>();
  const { records, sessions, saveRecord, deleteRecord, deleteSession } = useStore();

  if (!key) return null;

  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return null;

  const monthSessions = useMemo(() => sessionsForMonth(sessions, year, month), [sessions, year, month]);
  const totalHours = useMemo(() => monthTotal(records, sessions, year, month), [records, sessions, year, month]);
  const source = monthSessions.length > 0 ? "session" : "legacy";
  const legacyRecord = records.find((r) => r.year === year && r.month === month);

  const [editRec, setEditRec] = useState<HourRecord | null>(null);
  const [showAddSession, setShowAddSession] = useState(false);
  const [addSessionDate, setAddSessionDate] = useState(toISODate(new Date(year, month - 1, 1)));

  function confirmDeleteRecord(id: string) {
    Alert.alert("Удалить запись?", "Это действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: () => { deleteRecord(id); setEditRec(null); } },
    ]);
  }

  function handleAddSession() {
    setShowAddSession(true);
    setAddSessionDate(toISODate(new Date(year, month - 1, 1)));
  }

  function handleMonthPress(m: { id: string; year: number; month: number; hours: number; source: "session" | "legacy" }) {
    if (m.source === "session") {
      Alert.alert(
        "Этот месяц ведётся в разделе «Часы»",
        "Часы за этот месяц учитываются по записям времени. Редактирование появится в разделе «Часы».",
      );
      return;
    }
    const rec = records.find((r) => r.year === m.year && r.month === m.month);
    if (rec) setEditRec(rec);
  }

  // Build daily cells for HeatMap (day granularity)
  const dailyCells = useMemo(() => {
    if (monthSessions.length === 0) return [];
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayMap = new Map<number, number>();
    monthSessions.forEach((s) => {
      const day = parseInt(s.date.split("-")[2], 10);
      dayMap.set(day, (dayMap.get(day) || 0) + s.durationMinutes);
    });
    return Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => ({
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      value: dayMap.get(day) || 0,
    }));
  }, [monthSessions, year, month]);

  // Build monthly cells for the service-year HeatMap (not used here, but MonthDetails could show it)
  const handleLegacyMonthPress = (m: { id: string; year: number; month: number; hours: number; source: "session" | "legacy" }) => {
    if (m.source === "legacy") {
      const rec = records.find((r) => r.year === m.year && r.month === m.month);
      if (rec) setEditRec(rec);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <MonthHeader
        year={year}
        month={month}
        totalHours={totalHours}
        source={source}
        sessions={monthSessions}
        onPressAddSession={handleAddSession}
      />

      {source === "session" && dailyCells.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Тепловая карта дня" />
          <HeatMap cells={dailyCells} granularity="day" cellSize={24} gap={3} />
        </View>
      )}

      {source === "legacy" && (
        <View style={styles.legacyEmptyState}>
          <Text style={styles.legacyTitle}>Месяц без сессий</Text>
          <Text style={styles.legacySubtitle}>
            Часы за этот месяц записаны из месячной итоговой записи (legacy).
          </Text>
          {legacyRecord && (
            <View style={styles.legacyTotal}>
              <Text style={styles.legacyLabel}>Всего часов (legacy):</Text>
              <Text style={styles.legacyValue}>{formatHM(legacyRecord.hours)}</Text>
            </View>
          )}
          <Pressable style={styles.addSessionBtn} onPress={handleAddSession} accessibilityRole="button">
            <Text style={styles.addSessionBtnText}>+ Добавить первую сессию</Text>
          </Pressable>
        </View>
      )}

      {monthSessions.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Сессии" />
          <View style={styles.sessionList}>
            {monthSessions
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((session) => (
                <Pressable
                  key={session.id}
                  onPress={() => router.push(`/hours/entry?id=${session.id}`)}
                  onLongPress={() => Alert.alert("Удалить?", "Это действие нельзя отменить.", [
                    { text: "Отмена", style: "cancel" },
                    { text: "Удалить", style: "destructive", onPress: () => deleteSession(session.id) },
                  ])}
                  style={({ pressed }) => [styles.sessionRow, pressed && styles.sessionRowPressed]}
                >
                  <Text style={styles.sessionDate}>{formatDateDMY(session.date)}</Text>
                  <Text style={styles.sessionDuration}>{formatHM(session.durationMinutes / 60)}</Text>
                  {session.note ? <Text style={styles.sessionNote}>{session.note}</Text> : null}
                </Pressable>
              ))}
          </View>
        </View>
      )}

      <Modal
        visible={editRec !== null}
        title="Редактировать запись (legacy)"
        onClose={() => setEditRec(null)}
      >
        {editRec && (
          <RecordForm
            initial={editRec}
            sessions={sessions}
            onSave={(input) => { saveRecord(input); setEditRec(null); }}
            onDelete={() => confirmDeleteRecord(editRec.id)}
          />
        )}
      </Modal>

      <Modal
        visible={showAddSession}
        title="Добавить сессию"
        onClose={() => setShowAddSession(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalLabel}>Дата</Text>
          <Text style={styles.modalDateValue}>{formatDateDMY(addSessionDate)}</Text>
          <Pressable
            style={styles.modalActionBtn}
            onPress={() => {
              router.push(`/hours/entry?date=${addSessionDate}`);
              setShowAddSession(false);
            }}
          >
            <Text style={styles.modalActionBtnText}>Создать запись для этой даты</Text>
          </Pressable>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.groupedBg },
  content: { padding: 16, gap: 20 },
  section: { gap: 10 },
  sessionList: { gap: 8 },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sessionRowPressed: { opacity: 0.7 },
  sessionDate: { fontSize: 14, fontWeight: "600", color: COLORS.text, minWidth: 60 },
  sessionDuration: { fontSize: 14, fontWeight: "700", color: COLORS.blue },
  sessionNote: { fontSize: 13, color: COLORS.muted, flex: 1 },
  legacyEmptyState: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
  },
  legacyTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  legacySubtitle: { fontSize: 14, color: COLORS.muted, textAlign: "center", marginBottom: 16 },
  legacyTotal: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 16 },
  legacyLabel: { fontSize: 14, color: COLORS.muted },
  legacyValue: { fontSize: 23, fontWeight: "700", color: COLORS.text },
  addSessionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: COLORS.blue,
    borderRadius: 10,
  },
  addSessionBtnText: { color: COLORS.card, fontSize: 15, fontWeight: "700" },
  modalContent: { padding: 16, gap: 16 },
  modalLabel: { fontSize: 13, fontWeight: "600", color: COLORS.muted },
  modalDateValue: { fontSize: 21, fontWeight: "700", color: COLORS.text },
  modalActionBtn: {
    paddingVertical: 14,
    backgroundColor: COLORS.blue,
    borderRadius: 10,
    alignItems: "center",
  },
  modalActionBtnText: { color: COLORS.card, fontSize: 17, fontWeight: "700" },
});