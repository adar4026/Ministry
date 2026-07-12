import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { Card, SectionTitle } from "@/components/ui";
import { MonthChip } from "@/components/MonthChip";
import { Modal } from "@/components/Modal";
import { RecordForm } from "@/components/forms/RecordForm";
import { StatCard } from "@/components/StatCard";
import { TodayCard } from "@/components/TodayCard";
import { CAT, COLORS, byYearMonth, groupBySY } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import type { HourRecord } from "@/types";

export default function Dashboard() {
  const { records, events, talks, saveRecord, deleteRecord } = useStore();
  const [editRec, setEditRec] = useState<HourRecord | null>(null);

  const avgMonthlyHours = useMemo(() => {
    const totalHours = records.reduce((s, r) => s + r.hours, 0);
    const uniqueMonths = new Set(records.map((r) => `${r.year}-${r.month}`));
    return uniqueMonths.size > 0 ? totalHours / uniqueMonths.size : 0;
  }, [records]);
  const groups = useMemo(() => groupBySY(records), [records]);
  const curYear = groups[groups.length - 1];

  const recentEvents = useMemo(
    () => [...events].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [events],
  );

  function confirmDelete(id: string) {
    Alert.alert("Удалить запись?", "Это действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: () => { deleteRecord(id); setEditRec(null); } },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* TASK_004 Phase 1: Home-only dashboard card; scrolls with the page
          (inside the ScrollView, nothing fixed). Today-card content lands
          here in Phase 2. */}
      <View style={styles.dashboardCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>ЖУРНАЛ СЛУЖЕНИЯ</Text>
          <Text style={styles.appTitle}>Служение</Text>
        </View>
        <Avatar size={40} onPress={() => router.push("/profile")} />
      </View>

      <TodayCard />

      <View style={styles.statRow}>
        <StatCard label="Ср. время сл." value={avgMonthlyHours.toFixed(1)} color={COLORS.accent} />
        <StatCard label="Лет пионером" value="17.9" color="#22c55e" />
        <StatCard label="Служ. лет" value={groups.length} color="#8b5cf6" />
        <StatCard label="Публичных речей" value={talks.length} color="#f43f5e" />
        <StatCard label="Школы пионеров" value={4} color="#f59e0b" />
      </View>

      {curYear && (
        <Card style={styles.block}>
          <Text style={styles.smallLabel}>Текущий служебный год</Text>
          <Text style={styles.syTitle}>
            {curYear.sy} — {curYear.total} ч.
          </Text>
          <View style={styles.grid}>
            {[...curYear.records].sort(byYearMonth).map((r) => (
              <View key={r.id} style={styles.gridItem}>
                <MonthChip record={r} onPress={() => setEditRec(r)} />
              </View>
            ))}
          </View>
        </Card>
      )}

      <Card style={styles.block}>
        <SectionTitle>Последние события</SectionTitle>
        {recentEvents.map((ev) => (
          <View key={ev.id} style={styles.eventRow}>
            <View style={[styles.dot, { backgroundColor: (CAT[ev.category] ?? CAT.other).dot }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.eventTitle}>{ev.title}</Text>
              <Text style={styles.eventDate}>{ev.date}</Text>
            </View>
            <Badge category={ev.category} />
          </View>
        ))}
      </Card>

      <Modal
        visible={editRec !== null}
        title="Редактировать запись"
        onClose={() => setEditRec(null)}
      >
        {editRec && (
          <RecordForm
            initial={editRec}
            onSave={(input) => { saveRecord(input); setEditRec(null); }}
            onDelete={() => confirmDelete(editRec.id)}
          />
        )}
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  dashboardCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  kicker: { fontSize: 9, letterSpacing: 2, color: COLORS.muted, marginBottom: 2 },
  appTitle: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  block: {},
  smallLabel: { fontSize: 12, color: COLORS.muted, marginBottom: 4 },
  syTitle: { fontSize: 18, fontWeight: "800", color: COLORS.blue, marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  gridItem: { width: "23%" },
  eventRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  eventTitle: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  eventDate: { fontSize: 11, color: COLORS.muted },
});
