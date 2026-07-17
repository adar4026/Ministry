import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { MonthChip } from "@/components/MonthChip";
import { Modal } from "@/components/Modal";
import { RecordForm } from "@/components/forms/RecordForm";
import { UpcomingEventsCard } from "@/components/UpcomingEventsCard";
import { DS, EventCard, HomeBackground, HoursHeroCard, SectionHeader, SummaryCard } from "@/components/dashboard";
import { formatHM, serviceYearAggregation, toISODate, type ServiceYearMonth } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import type { HourRecord } from "@/types";

// Home header date, e.g. "14 июля, понедельник" (genitive month + weekday).
const MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];
const WEEKDAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
function formatHomeDate(now: Date): string {
  return `${now.getDate()} ${MONTHS_GEN[now.getMonth()]}, ${WEEKDAYS[now.getDay()]}`;
}

export default function Dashboard() {
  const { records, sessions, events, saveRecord, deleteRecord } = useStore();
  const [editRec, setEditRec] = useState<HourRecord | null>(null);

  // Session-aware unified service-year aggregation (TASK_005A addendum) —
  // Home no longer aggregates HourRecord directly. Months tracked only via
  // Session still appear here, unlike the Hours screen's groupBySY(), whose
  // contract is intentionally left untouched until TASK_005D.
  const groups = useMemo(() => serviceYearAggregation(records, sessions), [records, sessions]);
  const curYear = groups[groups.length - 1];

  // Last 5 events, most recent first, past-only (future events belong to
  // "Ближайшие события" and are excluded here).
  const todayISO = toISODate(new Date());
  const recentEvents = useMemo(
    () =>
      events
        .filter((e) => e.date <= todayISO)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5),
    [events, todayISO],
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
    <View style={styles.screen}>
      <HomeBackground />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.pageTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              Христианская жизнь
            </Text>
            <Text style={styles.pageDate}>{formatHomeDate(new Date())}</Text>
          </View>
          <Avatar size={40} onPress={() => router.push("/profile")} />
        </View>

        <HoursHeroCard />

        <View style={styles.section}>
          <SectionHeader title="Ближайшие события" />
          <UpcomingEventsCard />
        </View>

        {curYear && (
          <View style={styles.section}>
            <SectionHeader title="Текущий служебный год" />
            <SummaryCard title={curYear.sy} accent={DS.tealInk} meta={formatHM(curYear.total)}>
              <View style={styles.grid}>
                {curYear.months.map((m) => (
                  <View key={m.id} style={styles.gridItem}>
                    <MonthChip record={m} onPress={() => handleMonthPress(m)} />
                  </View>
                ))}
              </View>
            </SummaryCard>
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title="Последние события" />
          <View style={styles.eventList}>
            {recentEvents.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </View>
        </View>

        <Modal
          visible={editRec !== null}
          title="Редактировать запись"
          onClose={() => setEditRec(null)}
        >
          {editRec && (
            <RecordForm
              initial={editRec}
              sessions={sessions}
              onSave={(input) => { saveRecord(input); setEditRec(null); }}
              onDelete={() => confirmDelete(editRec.id)}
            />
          )}
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Home-only screen background (TASK_010): near-white base under the
  // HomeBackground gradient overlay; the shared Tabs sceneStyle bg is
  // untouched, so Hours/Events/Add/Profile are unaffected.
  screen: { flex: 1, backgroundColor: DS.homeBase },
  // Bounded height so the ScrollView scrolls on native now that it is nested
  // inside the screen View (was the tab-screen root before TASK_010); on web
  // this is a no-op. Mirrors the Hours screen's flex:1 scroll container.
  scroll: { flex: 1 },
  content: { padding: 16, gap: 28 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 40,
  },
  headerText: { flex: 1, marginRight: 12 },
  pageTitle: { fontSize: 22, fontWeight: "800", color: DS.navy, letterSpacing: -0.3 },
  pageDate: { fontSize: 14, color: DS.subText, fontWeight: "600", marginTop: 2 },
  // Title-to-content grouping: tighter than the gap between section blocks.
  section: { gap: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  gridItem: { width: "23%" },
  eventList: { gap: 11 },
});
