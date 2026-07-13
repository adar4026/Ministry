import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/ui";
import { MonthChip } from "@/components/MonthChip";
import { Modal } from "@/components/Modal";
import { RecordForm } from "@/components/forms/RecordForm";
import { TodayCard } from "@/components/TodayCard";
import { UpcomingEventsCard } from "@/components/UpcomingEventsCard";
import { CAT, COLORS, byYearMonth, groupBySY } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import type { HourRecord } from "@/types";

export default function Dashboard() {
  const { records, events, saveRecord, deleteRecord } = useStore();
  const [editRec, setEditRec] = useState<HourRecord | null>(null);

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
      {/* Plain iOS-style large title — no card chrome, matches the native
          large-title header pattern (Settings, App Store, Music). */}
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Журнал служения</Text>
        <Avatar size={40} onPress={() => router.push("/profile")} />
      </View>

      <TodayCard />

      <UpcomingEventsCard />

      {curYear && (
        <Card style={styles.homeCard}>
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

      <Card style={styles.homeCard}>
        <Text style={styles.sectionTitle}>Последние события</Text>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 40,
  },
  pageTitle: { fontSize: 34, fontWeight: "800", color: COLORS.text, letterSpacing: 0.2 },
  // Shared container for every remaining Home card: one consistent design
  // (large corner radius, generous padding, soft native-style shadow).
  homeCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sectionTitle: { fontSize: 22, fontWeight: "800", color: COLORS.text, marginBottom: 12 },
  smallLabel: { fontSize: 15, color: COLORS.muted, marginBottom: 4 },
  syTitle: { fontSize: 20, fontWeight: "800", color: COLORS.blue, marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  gridItem: { width: "23%" },
  eventRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  eventTitle: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  eventDate: { fontSize: 11, color: COLORS.muted },
});
