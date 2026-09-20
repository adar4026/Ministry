import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTabBarContentInset } from "@/components/TabBar";
import { DS, HomeBackground } from "@/components/dashboard";
import { MINISTRY } from "@/components/dashboard/tokens";
import { HOURS_COLORS as C } from "@/components/hours/hoursTokens";
import { HISTORY_COLORS as HC, HISTORY_FONT_FAMILY as FONT } from "@/components/hours/historyTokens";
import { CheckIcon } from "@/components/icons";
import { MF, dayWord, toISODate } from "@/data/constants";
import { participationByMonth, participationForMonth } from "@/data/participation";
import { useStore } from "@/store/StoreContext";
import type { ServiceParticipation } from "@/types";
import { ParticipationRow } from "./ParticipationRow";
import { ParticipationSheet } from "./ParticipationSheet";

// TASK_073 — what the `hours` tab shows for a PUBLISHER: the same page
// frame as the Hours dashboard (large title, HomeBackground, cards on the
// Hours tokens) but its content is the participation journal, grouped by
// month, newest first:
//
//   Служение
//   Журнал участия
//   [ ✓ Отметить служение ]
//   Сентябрь 2026 · 8 дней
//   ┌ 20 сентября   Служил ┐ …
//
// Hours, the timer and the hours nav list are not rendered here; their data
// is untouched and comes back the moment the mode is switched back.
export function ParticipationJournal() {
  const { participation } = useStore();
  const bottomInset = useTabBarContentInset();
  const todayISO = toISODate(new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceParticipation | null>(null);

  const months = useMemo(() => participationByMonth(participation), [participation]);

  return (
    <View style={styles.screen} testID="participation-journal">
      <HomeBackground />
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Служение</Text>
          <Text style={styles.subtitle}>Журнал участия</Text>
        </View>

        <Pressable
          onPress={() => setCreateOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Отметить служение"
          style={({ pressed }) => [styles.markBtn, pressed && styles.pressed]}
          testID="journal-mark-button"
        >
          <CheckIcon size={18} color="#fff" />
          <Text style={styles.markText}>Отметить служение</Text>
        </Pressable>

        {months.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Отметок пока нет</Text>
            <Text style={styles.emptyBody}>Отмечайте дни, когда участвовали в служении, — они соберутся здесь по месяцам.</Text>
          </View>
        ) : (
          months.map((m) => {
            const rows = participationForMonth(participation, m.year, m.month);
            return (
              <View key={m.key} style={styles.monthSection} testID={`journal-month-${m.key}`}>
                <View style={styles.monthHeadRow}>
                  <Text style={styles.monthHeading}>{`${MF[m.month - 1]} ${m.year}`}</Text>
                  <Text style={styles.monthCount}>{`${m.days} ${dayWord(m.days)}`}</Text>
                </View>
                <View style={styles.listCard}>
                  {rows.map((item, i) => (
                    <ParticipationRow
                      key={item.id}
                      item={item}
                      showDivider={i < rows.length - 1}
                      onPress={setEditing}
                      todayISO={todayISO}
                    />
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <ParticipationSheet visible={createOpen} onClose={() => setCreateOpen(false)} />
      <ParticipationSheet visible={editing !== null} existing={editing ?? undefined} onClose={() => setEditing(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.homeBase },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 8, gap: 16 },
  header: { paddingHorizontal: 4, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 34, fontWeight: "700", color: C.primaryText },
  subtitle: { fontSize: 15, color: C.secondaryText, marginTop: 2 },
  markBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: MINISTRY.primary,
    borderRadius: 18,
    paddingVertical: 15,
  },
  markText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  pressed: { opacity: 0.85 },
  monthSection: { gap: 8 },
  monthHeadRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 4 },
  monthHeading: { fontSize: 22, fontWeight: "700", color: HC.secondaryText, fontFamily: FONT },
  monthCount: { fontSize: 15, fontWeight: "600", color: MINISTRY.primary, fontFamily: FONT },
  listCard: { backgroundColor: HC.cardBackground, borderRadius: 18, paddingHorizontal: 16 },
  emptyCard: { backgroundColor: HC.cardBackground, borderRadius: 22, padding: 22, gap: 6 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: C.primaryText },
  emptyBody: { fontSize: 14, lineHeight: 20, color: C.secondaryText },
});
