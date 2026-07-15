import { router } from "expo-router";
import { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "@/components/ui";
import { COLORS, MN, formatDateDMY, formatHM, sessionsForMonth, svcYear } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import type { HourRecord, Session } from "@/types";

export type HistoryRow =
  | { kind: "session"; session: Session }
  | { kind: "legacy"; hours: number };

export type MonthGroup = { year: number; month: number; rows: HistoryRow[] };
export type YearGroup = { sy: string; months: MonthGroup[] };

// Reverse-chronological Session history, grouped Service Year -> Month —
// reuses the Hours screen's visual language (Card, muted labels, small
// month chips), not a new one. A month with >=1 Session shows one row per
// Session; a month with zero Sessions but a legacy HourRecord shows one
// collapsed, inert row, for continuity with the Hours screen. No Month
// Details yet (TASK_005D) — legacy rows do nothing on tap.
export function buildHistory(records: HourRecord[], sessions: Session[]): YearGroup[] {
  const seen = new Set<string>();
  const keys: { year: number; month: number }[] = [];
  const addKey = (year: number, month: number) => {
    const key = `${year}-${month}`;
    if (!seen.has(key)) {
      seen.add(key);
      keys.push({ year, month });
    }
  };
  records.forEach((r) => addKey(r.year, r.month));
  sessions.forEach((s) => {
    const [y, m] = s.date.split("-").map(Number);
    addKey(y, m);
  });

  const map: Record<string, YearGroup> = {};
  keys.forEach(({ year, month }) => {
    const sy = svcYear(year, month);
    if (!map[sy]) map[sy] = { sy, months: [] };

    const monthSessions = sessionsForMonth(sessions, year, month);
    let rows: HistoryRow[];
    if (monthSessions.length > 0) {
      rows = [...monthSessions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((session) => ({ kind: "session" as const, session }));
    } else {
      const rec = records.find((r) => r.year === year && r.month === month);
      rows = rec ? [{ kind: "legacy" as const, hours: rec.hours }] : [];
    }
    map[sy].months.push({ year, month, rows });
  });

  Object.values(map).forEach((g) => {
    g.months.sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month));
  });
  return Object.values(map).sort((a, b) => b.sy.localeCompare(a.sy));
}

export default function HistoryScreen() {
  const { records, sessions, deleteSession } = useStore();
  const groups = useMemo(() => buildHistory(records, sessions), [records, sessions]);

  function confirmDeleteSession(id: string) {
    Alert.alert("Удалить запись?", "Это действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: () => deleteSession(id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Text style={styles.backText}>‹ Назад</Text>
        </Pressable>
        <Text style={styles.title}>История</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {groups.length === 0 && <Text style={styles.empty}>Нет данных</Text>}
        {groups.map((g) => (
          <Card key={g.sy}>
            <Text style={styles.sy}>{g.sy}</Text>
            {g.months.map((m) => (
              <View key={`${m.year}-${m.month}`} style={styles.monthBlock}>
                <Text style={styles.monthLabel}>
                  {MN[m.month - 1]} {m.year}
                </Text>
                {m.rows.map((row, i) =>
                  row.kind === "session" ? (
                    <Pressable
                      key={row.session.id}
                      onPress={() => router.push(`/hours/entry?id=${row.session.id}`)}
                      onLongPress={() => confirmDeleteSession(row.session.id)}
                      style={({ pressed }) => [styles.sessionRow, pressed && styles.pressed]}
                    >
                      <Text style={styles.sessionDate}>{formatDateDMY(row.session.date)}</Text>
                      <Text style={styles.sessionDuration}>
                        {formatHM(row.session.durationMinutes / 60)}
                      </Text>
                      {row.session.note ? (
                        <Text style={styles.sessionNote}>{row.session.note}</Text>
                      ) : null}
                    </Pressable>
                  ) : (
                    <View key={`legacy-${i}`} style={styles.legacyRow}>
                      <Text style={styles.legacyText}>
                        Записано по месяцу: {row.hours} ч. (без сессий)
                      </Text>
                    </View>
                  ),
                )}
              </View>
            ))}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  back: { paddingVertical: 6, paddingRight: 12 },
  backText: { fontSize: 14, fontWeight: "600", color: COLORS.blue },
  title: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  content: { padding: 16, paddingTop: 4, gap: 12 },
  empty: { fontSize: 13, color: COLORS.muted, textAlign: "center", marginTop: 24 },
  sy: { fontSize: 14, fontWeight: "800", color: COLORS.text, marginBottom: 8 },
  monthBlock: { marginBottom: 10 },
  monthLabel: { fontSize: 12, fontWeight: "700", color: COLORS.muted, marginBottom: 4 },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  pressed: { opacity: 0.7 },
  sessionDate: { fontSize: 12, color: COLORS.text, fontWeight: "600" },
  sessionDuration: { fontSize: 12, color: COLORS.blue, fontWeight: "700" },
  sessionNote: { fontSize: 11, color: COLORS.muted, flex: 1 },
  legacyRow: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.light,
  },
  legacyText: { fontSize: 11, color: COLORS.muted },
});
