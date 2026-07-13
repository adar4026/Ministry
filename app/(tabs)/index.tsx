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
import { CAT, COLORS, serviceYearAggregation, type ServiceYearMonth } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import type { HourRecord } from "@/types";

export default function Dashboard() {
  const { records, sessions, events, saveRecord, deleteRecord } = useStore();
  const [editRec, setEditRec] = useState<HourRecord | null>(null);

  // Session-aware unified service-year aggregation (TASK_005A addendum) —
  // Home no longer aggregates HourRecord directly. Months tracked only via
  // Session still appear here, unlike the Hours screen's groupBySY(), whose
  // contract is intentionally left untouched until TASK_005D.
  const groups = useMemo(() => serviceYearAggregation(records, sessions), [records, sessions]);
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

  // Editing behavior per the TASK_005A addendum: a Session-authoritative
  // month never opens the legacy RecordForm — only a HourRecord-authoritative
  // month does, and only ever bound to the real HourRecord, never the
  // ViewModel. Full navigation to Month Details arrives in TASK_005D.
  function handleMonthPress(m: ServiceYearMonth) {
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Plain iOS-style large title — no card chrome, matches the native
          large-title header pattern (Settings, App Store, Music). */}
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Журнал служения</Text>
        <Avatar size={40} onPress={() => router.push("/profile")} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Сегодня</Text>
        <TodayCard />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ближайшие события</Text>
        <UpcomingEventsCard />
      </View>

      {curYear && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Текущий служебный год</Text>
          <Card style={styles.homeCard}>
            <Text style={styles.syTitle}>
              {curYear.sy} — {curYear.total} ч.
            </Text>
            <View style={styles.grid}>
              {curYear.months.map((m) => (
                <View key={m.id} style={styles.gridItem}>
                  <MonthChip record={m} onPress={() => handleMonthPress(m)} />
                </View>
              ))}
            </View>
          </Card>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Последние события</Text>
        <Card style={styles.homeCard}>
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
      </View>

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
  // Home-only screen background (Apple systemGroupedBackground); the shared
  // Tabs sceneStyle bg is untouched, so Hours/Events/Add/Profile are unaffected.
  screen: { backgroundColor: COLORS.groupedBg },
  // Wider gap than other screens: a more open, breathable grouped-list feel
  // between Header / Today / Upcoming Events / Current Service Year / History.
  content: { padding: 16, gap: 28 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 40,
  },
  pageTitle: { fontSize: 28, fontWeight: "800", color: COLORS.text, letterSpacing: 0.2 },
  // Title-to-card grouping: tighter than the gap between section blocks
  // (styles.content below), so the new title-above-card hierarchy reads as
  // one unit per section rather than four evenly-spaced items.
  section: { gap: 10 },
  sectionTitle: { fontSize: 22, fontWeight: "800", color: COLORS.text },
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
  syTitle: { fontSize: 20, fontWeight: "800", color: COLORS.blue, marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  gridItem: { width: "23%" },
  eventRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  eventTitle: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  eventDate: { fontSize: 11, color: COLORS.muted },
});
