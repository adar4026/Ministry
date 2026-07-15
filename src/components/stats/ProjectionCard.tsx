import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, formatHM, MONTHLY_GOAL, monthProgress, projectMonthEnd, toISODate, trailingPace } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import { useMemo } from "react";

interface ProjectionCardProps {
  onPress?: () => void;
}

export function ProjectionCard({ onPress }: ProjectionCardProps) {
  const { records, sessions } = useStore();

  const projection = useMemo(() => {
    const now = new Date();
    const p = monthProgress(records, now, sessions);

    // Current pace (7-day and 30-day)
    const pace7 = trailingPace(sessions, 7, now);
    const pace30 = trailingPace(sessions, 30, now);

    // Project month end using both paces
    const proj7 = pace7 > 0 ? projectMonthEnd(p.hoursDone, pace7, p.daysLeft) : p.hoursDone;
    const proj30 = pace30 > 0 ? projectMonthEnd(p.hoursDone, pace30, p.daysLeft) : p.hoursDone;

    // Will goal be met?
    const willMeetGoal7 = pace7 > 0 ? proj7 >= MONTHLY_GOAL : false;
    const willMeetGoal30 = pace30 > 0 ? proj30 >= MONTHLY_GOAL : false;

    // Days to goal at current pace
    const daysToGoal7 = pace7 > 0 && p.hoursRemaining > 0 ? Math.ceil(p.hoursRemaining / (pace7 / 60)) : null;
    const daysToGoal30 = pace30 > 0 && p.hoursRemaining > 0 ? Math.ceil(p.hoursRemaining / (pace30 / 60)) : null;

    // Projected goal date
    const goalDate = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + (p.daysLeft - 1)));

    return {
      hoursDone: p.hoursDone,
      hoursRemaining: p.hoursRemaining,
      daysLeft: p.daysLeft,
      pace7,
      pace30,
      proj7,
      proj30,
      willMeetGoal7,
      willMeetGoal30,
      daysToGoal7,
      daysToGoal30,
      goalDate,
    };
  }, [records, sessions]);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Month end projection: 7-day pace ${formatHM(projection.proj7)}, 30-day pace ${formatHM(projection.proj30)}. Goal ${projection.willMeetGoal7 ? "will be met" : "will not be met"} by end of month.`}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Month End Projection</Text>
        <Text style={styles.subtitle}>Based on 7- and 30-day pace</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.projections}>
        <View style={styles.projCol}>
          <Text style={styles.projLabel}>7-day pace ({formatHM(projection.pace7 / 60)} / day)</Text>
          <Text style={[styles.projValue, { color: projection.willMeetGoal7 ? COLORS.green : COLORS.danger }]}>
            {formatHM(projection.proj7)}
          </Text>
          <Text style={[styles.projSub, { color: projection.willMeetGoal7 ? COLORS.green : COLORS.danger }]}>
            {projection.willMeetGoal7 ? "Goal will be reached" : "Goal will not be reached"}
          </Text>
          {projection.daysToGoal7 && (
            <Text style={styles.detail}>
              {projection.daysToGoal7 <= projection.daysLeft ? "Can reach" : "Cannot reach"} {projection.daysToGoal7} days to goal
            </Text>
          )}
        </View>

        <View style={[styles.projCol, styles.projColDivider]} />

        <View style={styles.projCol}>
          <Text style={styles.projLabel}>30-day pace ({formatHM(projection.pace30 / 60)} / day)</Text>
          <Text style={[styles.projValue, { color: projection.willMeetGoal30 ? COLORS.green : COLORS.danger }]}>
            {formatHM(projection.proj30)}
          </Text>
          <Text style={[styles.projSub, { color: projection.willMeetGoal30 ? COLORS.green : COLORS.danger }]}>
            {projection.willMeetGoal30 ? "Goal will be reached" : "Goal will not be reached"}
          </Text>
          {projection.daysToGoal30 && (
            <Text style={styles.detail}>
              {projection.daysToGoal30 <= projection.daysLeft ? "Can reach" : "Cannot reach"} {projection.daysToGoal30} days to goal
            </Text>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Days left</Text>
          <Text style={styles.footerValue}>{projection.daysLeft}</Text>
        </View>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>To goal</Text>
          <Text style={styles.footerValue}>{formatHM(projection.hoursRemaining)}</Text>
        </View>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Month ends</Text>
          <Text style={styles.footerValue}>{projection.goalDate.split("-").reverse().join(".")}</Text>
        </View>
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
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  projections: { flexDirection: "row" },
  projCol: { flex: 1, paddingHorizontal: 4 },
  projColDivider: { borderLeftWidth: 1, borderLeftColor: COLORS.border },
  projLabel: { fontSize: 11, fontWeight: "700", color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  projValue: { fontSize: 28, fontWeight: "800", letterSpacing: -0.6 },
  projSub: { fontSize: 11, fontWeight: "600", marginTop: 4 },
  detail: { fontSize: 12, fontWeight: "600", color: COLORS.accent, marginTop: 8 },
  footer: { flexDirection: "row", justifyContent: "space-around", marginTop: 4 },
  footerItem: { alignItems: "center" },
  footerLabel: { fontSize: 10, fontWeight: "700", color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  footerValue: { fontSize: 16, fontWeight: "800", color: COLORS.navy, marginTop: 2 },
});