import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { COLORS, formatHM, MF, MONTHLY_GOAL, monthTotal, svcYear } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import type { Session } from "@/types";

interface MonthHeaderProps {
  year: number;
  month: number;
  totalHours: number;
  source: "session" | "legacy";
  sessions?: Session[];
  onPressAddSession?: () => void;
}

export function MonthHeader({
  year,
  month,
  totalHours,
  source,
  sessions = [],
  onPressAddSession,
}: MonthHeaderProps) {
  const { records } = useStore();
  const goal = MONTHLY_GOAL;
  const delta = totalHours - goal;
  const isAhead = delta >= 0;
  const sy = svcYear(year, month);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.monthLabel}>{MF[month - 1]} {year}</Text>
          <Text style={styles.syLabel}>{sy}</Text>
        </View>
        <View style={[styles.sourceBadge, { backgroundColor: source === "session" ? COLORS.light : COLORS.warn }]}>
          <Text style={[styles.sourceText, { color: source === "session" ? COLORS.accent : COLORS.warn }]}>
            {source === "session" ? "Сессии" : "Легаси"}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatHM(totalHours)}</Text>
          <Text style={styles.statLabel}>Всего за месяц</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: isAhead ? COLORS.green : COLORS.danger }]}>
            {isAhead ? "+" : ""}{formatHM(Math.abs(delta))}
          </Text>
          <Text style={styles.statLabel}>От цели ({goal} ч)</Text>
        </View>
      </View>

      {onPressAddSession && (
        <Pressable style={styles.addBtn} onPress={onPressAddSession} accessibilityRole="button">
          <Text style={styles.addBtnText}>+ Добавить сессию в этот месяц</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  titleWrap: { gap: 2 },
  monthLabel: { fontSize: 20, fontWeight: "800", color: COLORS.text, letterSpacing: -0.3 },
  syLabel: { fontSize: 12, fontWeight: "600", color: COLORS.muted },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sourceText: { fontSize: 11, fontWeight: "700" },
  statsRow: { flexDirection: "row", marginTop: 16, gap: 16 },
  stat: { flex: 1 },
  statValue: { fontSize: 22, fontWeight: "800", color: COLORS.text, letterSpacing: -0.3 },
  statLabel: { fontSize: 11, color: COLORS.muted, fontWeight: "600", marginTop: 2 },
  addBtn: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.light,
    borderRadius: 10,
    alignItems: "center",
  },
  addBtnText: { color: COLORS.accent, fontSize: 14, fontWeight: "700" },
});