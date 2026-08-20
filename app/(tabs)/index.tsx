import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { MonthChip } from "@/components/MonthChip";
import { Modal } from "@/components/Modal";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { RecordForm } from "@/components/forms/RecordForm";
import { UpcomingEventsCard } from "@/components/UpcomingEventsCard";
import { useTabBarContentInset } from "@/components/TabBar";
import { DS, EventCard, HomeBackground, HoursHeroCard, SectionHeader, SummaryCard } from "@/components/dashboard";
import { formatHM, serviceYearAggregation, toISODate, type ServiceYearMonth } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import type { HourRecord } from "@/types";

// Home header date (TASK_014): "Пятница, 17 июля" — capitalized weekday
// first, then day + genitive month.
const MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];
const WEEKDAYS = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
export function formatHomeDate(now: Date): string {
  return `${WEEKDAYS[now.getDay()]}, ${now.getDate()} ${MONTHS_GEN[now.getMonth()]}`;
}

export default function Dashboard() {
  const { records, sessions, events, profile, customCategories, saveProfile, saveRecord, deleteRecord } = useStore();
  // TASK_048 — Home's background now runs edge-to-edge (the Tabs sceneStyle
  // no longer pads the bottom on this route) and the content scrolls under
  // the floating tab bar, so the last card's clearance has to come from the
  // scroll content itself: bar height + the device's bottom safe-area inset
  // + a safe gap. The previous arrangement reserved a hardcoded 90pt, which
  // is less than the bar actually occupies on any device with a home
  // indicator (65 + 34 = 99).
  const bottomInset = useTabBarContentInset();
  const [editRec, setEditRec] = useState<HourRecord | null>(null);
  const profileInitials = profile.displayName?.trim()[0]?.toUpperCase();

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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.pageTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              Христианская жизнь
            </Text>
            <Text style={styles.pageDate}>{formatHomeDate(new Date())}</Text>
          </View>
          <ProfileAvatar
            photoUri={profile.profilePhotoUri}
            initials={profileInitials}
            size={40}
            hitSlop={2}
            onPress={() => router.push("/profile")}
            accessibilityLabel="Открыть профиль"
            onInvalidPhoto={() =>
              saveProfile({ displayName: profile.displayName, events: profile.events, profilePhotoUri: undefined })
            }
          />
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
              <EventCard key={ev.id} event={ev} customCategories={customCategories} />
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
  // paddingTop trimmed (16 -> 10, TASK_048): the top safe-area strip is now
  // painted with the Home gradient's first stop in app/(tabs)/_layout.tsx,
  // so the header reads as part of the same composition and no longer needs
  // to be pushed down away from a contrasting band. paddingBottom is applied
  // at the call site from useTabBarContentInset().
  content: { paddingHorizontal: 16, paddingTop: 10, gap: 22 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 40,
  },
  headerText: { flex: 1, marginRight: 12 },
  pageTitle: { fontSize: 23, fontWeight: "700", color: DS.navy, letterSpacing: -0.3 },
  // DS.onTintInk, not DS.subText (TASK_048): this caption sits on the Home
  // gradient, where DS.subText measured 3.2:1.
  pageDate: { fontSize: 14, color: DS.onTintInk, fontWeight: "600", marginTop: 1 },
  // Title-to-content grouping: tighter than the gap between section blocks.
  section: { gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  gridItem: { width: "23%" },
  eventList: { gap: 10 },
});
