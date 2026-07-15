import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, formatHM } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import { useMemo } from "react";

interface PaceCardProps {
  onPress?: () => void;
}

export function PaceCard({ onPress }: PaceCardProps) {
  const { sessions } = useStore();

  const pace = useMemo(() => {
    const now = new Date();
    const pace7 = trailingPace(sessions, now, 7);
    const pace30 = trailingPace(sessions, now, 30);
    const pace90 = trailingPace(sessions, now, 90);

    return { pace7, pace30, pace90 };
  }, [sessions]);

  function trailingPace(sessions: any[], now: Date, days: number): number {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffISO = cutoff.toISOString().split("T")[0];
    const windowSessions = sessions.filter((s) => s.date >= cutoffISO);
    if (windowSessions.length === 0) return 0;
    const totalMinutes = windowSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const elapsedDays = Math.max(1, Math.ceil((now.getTime() - cutoff.getTime()) / 86400000));
    return Math.round(totalMinutes / elapsedDays);
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`ÃÂ¢ÃÂµÃÂ¼ÃÂ¿: 7 ÃÂ´ÃÂ½. ${pace.pace7 ? formatHM(pace.pace7 / 60) + " / ÃÂ´ÃÂ½." : "ÃÂ½ÃÂµÃâ ÃÂ´ÃÂ°ÃÂ½ÃÂ½Ãâ¹Ãâ¦"}, 30 ÃÂ´ÃÂ½. ${pace.pace30 ? formatHM(pace.pace30 / 60) + " / ÃÂ´ÃÂ½." : "ÃÂ½ÃÂµÃâ ÃÂ´ÃÂ°ÃÂ½ÃÂ½Ãâ¹Ãâ¦"}, 90 ÃÂ´ÃÂ½. ${pace.pace90 ? formatHM(pace.pace90 / 60) + " / ÃÂ´ÃÂ½." : "ÃÂ½ÃÂµÃâ ÃÂ´ÃÂ°ÃÂ½ÃÂ½Ãâ¹Ãâ¦"}`}
    >
      <View style={styles.header}>
        <Text style={styles.title}>ÃÂ¢ÃÂµÃÂ¼ÃÂ¿ ÃÂÃÂ»ÃÆÃÂ¶ÃÂµÃÂ½ÃÂ¸ÃÂ</Text>
        <Text style={styles.subtitle}>ÃÂ¡Ãâ¬ÃÂµÃÂ´ÃÂ½ÃÂ¸ÃÂµ ÃÂ¼ÃÂ¸ÃÂ½ÃÆÃâÃâ¹ / ÃÂ´ÃÂµÃÂ½ÃÅ</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.paceItem}>
          <Text style={styles.period}>7 ÃÂ´ÃÂ½.</Text>
          <Text style={styles.value}>{pace.pace7 > 0 ? formatHM(pace.pace7 / 60) : "Ã¢â¬â"}</Text>
          <Text style={styles.unit}>/ ÃÂ´ÃÂµÃÂ½ÃÅ</Text>
        </View>
        <View style={styles.paceItem}>
          <Text style={styles.period}>30 ÃÂ´ÃÂ½.</Text>
          <Text style={styles.value}>{pace.pace30 > 0 ? formatHM(pace.pace30 / 60) : "Ã¢â¬â"}</Text>
          <Text style={styles.unit}>/ ÃÂ´ÃÂµÃÂ½ÃÅ</Text>
        </View>
        <View style={styles.paceItem}>
          <Text style={styles.period}>90 ÃÂ´ÃÂ½.</Text>
          <Text style={styles.value}>{pace.pace90 > 0 ? formatHM(pace.pace90 / 60) : "Ã¢â¬â"}</Text>
          <Text style={styles.unit}>/ ÃÂ´ÃÂµÃÂ½ÃÅ</Text>
        </View>
      </View>

      {pace.pace7 > 0 && pace.pace30 > 0 && (
        <View style={styles.trend}>
          <Text style={styles.trendLabel}>ÃÂ¢Ãâ¬ÃÂµÃÂ½ÃÂ´ (7 vs 30):</Text>
          <Text style={[styles.trendValue, { color: pace.pace7 >= pace.pace30 ? COLORS.green : COLORS.danger }]}>
            {pace.pace7 >= pace.pace30 ? "Ã¢â â" : "Ã¢â â"} {Math.abs(pace.pace7 - pace.pace30)} ÃÂ¼ÃÂ¸ÃÂ½.
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  pressed: { opacity: 0.9 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  subtitle: { fontSize: 11, fontWeight: "600", color: COLORS.muted },
  grid: { flexDirection: "row", gap: 12 },
  paceItem: { flex: 1, alignItems: "center" },
  period: { fontSize: 11, fontWeight: "700", color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  value: { fontSize: 24, fontWeight: "800", color: COLORS.navy, letterSpacing: -0.4 },
  unit: { fontSize: 11, fontWeight: "600", color: COLORS.muted, marginTop: 2 },
  trend: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  trendLabel: { fontSize: 12, fontWeight: "600", color: COLORS.muted },
  trendValue: { fontSize: 14, fontWeight: "700" },
});