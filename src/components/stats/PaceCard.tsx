import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/data/constants";
import { trailingPace } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import { useMemo } from "react";

export function PaceCard() {
  const { sessions } = useStore();

  const pace = useMemo(() => {
    const now = new Date();
    const pace7 = trailingPace(sessions, 7, now);
    const pace30 = trailingPace(sessions, 30, now);
    const pace60 = trailingPace(sessions, 60, now);
    const trend = pace7 - pace30;

    return {
      avg7d: pace7 / 60,
      avg30d: pace30 / 60,
      avg60d: pace60 / 60,
      trend: trend / 60,
    };
  }, [sessions]);

  const avg7 = pace.avg7d;
  const avg30 = pace.avg30d;
  const avg60 = pace.avg60d;
  const trend = pace.trend;
  const isImproving = trend > 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Pace</Text>
        <Text style={styles.subtitle}>Average daily hours</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.paceItem}>
          <Text style={styles.period}>7d</Text>
          <Text style={styles.value}>{avg7.toFixed(1)}</Text>
          <Text style={styles.unit}>h/day</Text>
        </View>
        <View style={styles.paceItem}>
          <Text style={styles.period}>30d</Text>
          <Text style={styles.value}>{avg30.toFixed(1)}</Text>
          <Text style={styles.unit}>h/day</Text>
        </View>
        <View style={styles.paceItem}>
          <Text style={styles.period}>60d</Text>
          <Text style={styles.value}>{avg60.toFixed(1)}</Text>
          <Text style={styles.unit}>h/day</Text>
        </View>
      </View>

      <View style={styles.trend}>
        <Text style={styles.trendLabel}>Trend (7 vs 30)</Text>
        <Text style={[styles.trendValue, isImproving ? styles.trendUp : styles.trendDown]}>
          {isImproving ? "+" : ""}{trend.toFixed(1)} h/day
        </Text>
      </View>
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
  trendUp: { color: COLORS.green },
  trendDown: { color: COLORS.danger },
});

export default PaceCard;