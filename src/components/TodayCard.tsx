import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui";
import {
  COLORS,
  MONTHLY_GOAL,
  formatDateDMY,
  formatHM,
  monthProgress,
} from "@/data/constants";
import { useStore } from "@/store/StoreContext";

const STATUS = {
  ahead: { emoji: "🟢", label: "Опережение графика" },
  on: { emoji: "🟡", label: "По графику" },
  behind: { emoji: "🔴", label: "Отставание от графика" },
} as const;

// Russian plural for days: 1 день / 2 дня / 5 дней.
function dayWord(n: number): string {
  const d10 = n % 10;
  const d100 = n % 100;
  if (d10 === 1 && d100 !== 11) return "день";
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return "дня";
  return "дней";
}

function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function TodayCard() {
  const { records } = useStore();

  const now = new Date();
  const p = useMemo(() => monthProgress(records, now), [records, now.getDate()]);
  const status = STATUS[p.status];

  return (
    <Card>
      <View style={styles.head}>
        <Text style={styles.title}>Сегодня</Text>
        <Text style={styles.date}>{formatDateDMY(toISO(now))}</Text>
      </View>

      <Text style={styles.status}>
        {status.emoji} {status.label}
      </Text>

      <View style={styles.rows}>
        <Row label="До конца месяца" value={`${p.daysLeft} ${dayWord(p.daysLeft)}`} />
        <Row label="Часы в этом месяце" value={formatHM(p.hoursDone)} />
        <Row label={`Осталось до цели (${MONTHLY_GOAL} ч)`} value={formatHM(p.hoursRemaining)} />
        <Row label="Нужно в день" value={formatHM(p.requiredPerDay)} last />
      </View>
    </Card>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 14, fontWeight: "800", color: COLORS.text },
  date: { fontSize: 12, fontWeight: "600", color: COLORS.muted },
  status: { fontSize: 12, fontWeight: "700", color: COLORS.text, marginTop: 8 },
  rows: { marginTop: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { fontSize: 12, color: COLORS.muted },
  rowValue: { fontSize: 13, fontWeight: "700", color: COLORS.blue },
});
