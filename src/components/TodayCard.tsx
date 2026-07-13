import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui";
import {
  COLORS,
  MONTHLY_GOAL,
  dayWord,
  formatDateDMY,
  formatHM,
  monthProgress,
  toISODate,
} from "@/data/constants";
import { useStore } from "@/store/StoreContext";

const STATUS = {
  ahead: { emoji: "🟢", label: "Опережение графика" },
  on: { emoji: "🟡", label: "По графику" },
  behind: { emoji: "🔴", label: "Отставание от графика" },
} as const;

export function TodayCard() {
  const { records, sessions } = useStore();

  const now = new Date();
  const p = useMemo(() => monthProgress(records, now, sessions), [records, sessions, now.getDate()]);
  const status = STATUS[p.status];

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.date}>{formatDateDMY(toISODate(now))}</Text>
      </View>

      <Text style={styles.status}>
        {status.emoji} {status.label}
      </Text>

      {/* Primary value — the single most important number on Home: hours
          completed this month. Everything else here is supporting detail. */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Часы в этом месяце</Text>
        <Text style={styles.heroValue}>{formatHM(p.hoursDone)}</Text>
      </View>

      <View style={styles.secondaryRow}>
        <View style={styles.secondaryItem}>
          <Text style={styles.secondaryLabel}>Осталось до цели ({MONTHLY_GOAL} ч)</Text>
          <Text style={styles.secondaryValue}>{formatHM(p.hoursRemaining)}</Text>
        </View>
        <View style={styles.secondaryItem}>
          <Text style={styles.secondaryLabel}>Нужно в день</Text>
          <Text style={styles.secondaryValue}>{formatHM(p.requiredPerDay)}</Text>
        </View>
      </View>

      <Text style={styles.footnote}>
        До конца месяца: {p.daysLeft} {dayWord(p.daysLeft)}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  head: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center" },
  date: { fontSize: 15, fontWeight: "600", color: COLORS.muted },
  status: { fontSize: 17, fontWeight: "700", color: COLORS.text, marginTop: 10 },
  hero: { marginTop: 20 },
  heroLabel: { fontSize: 15, color: COLORS.muted },
  heroValue: { fontSize: 36, fontWeight: "800", color: COLORS.blue, marginTop: 2 },
  secondaryRow: { flexDirection: "row", gap: 24, marginTop: 20 },
  secondaryItem: { flex: 1 },
  secondaryLabel: { fontSize: 13, color: COLORS.muted, minHeight: 32 },
  secondaryValue: { fontSize: 22, fontWeight: "700", color: COLORS.text, marginTop: 2 },
  footnote: { fontSize: 13, color: COLORS.muted, marginTop: 16 },
});
