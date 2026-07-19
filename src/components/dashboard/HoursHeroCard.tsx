import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useStore } from "@/store/StoreContext";
import { MONTHLY_GOAL, dayWord, formatHMRounded, formatHoursWord, monthProgress } from "@/data/constants";
import { computePaceDeviation, formatDeviationLabel } from "@/data/cumulativeProgress";
import { CalendarIcon, ClockIcon, PlusIcon } from "@/components/icons";
import { DS } from "./tokens";
import { HeroProgressRing } from "./HeroProgressRing";

// Nominative month names, used only in the spoken accessibility label (no
// visible month/year text in this card as of TASK_015 — see below).
const MONTHS_NOM = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

function StatItem({ icon, label, value }: { icon: ReactNode; label?: string; value: string }) {
  return (
    <View style={styles.statItem}>
      {icon}
      <View style={styles.statText}>
        {label ? <Text style={styles.statLabel} numberOfLines={1}>{label}</Text> : null}
        <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// Home monthly-progress card ("Ministry Calm" redesign, TASK_014; pace-
// deviation label TASK_015 — see docs/TASKS/TASK_015_HOME_MONTHLY_PACE_STATUS.md).
// A cumulative line-chart direction was prototyped and implemented for this
// card, then rejected in favor of keeping the original horizontal progress
// bar with the new pace-status label added below it (see that doc's
// "Rejected direction" section). Sole purpose is to communicate progress
// toward the monthly goal. Starting ministry (the timer) lives on the Hours
// screen; the "+ Добавить" pill here routes to the existing Manual Time
// Entry screen (`/hours/entry`, TASK_005B), not the timer. "Детали" reuses
// the existing Month Details route (`/hours/month/[key]`). Reads only
// through useStore()/monthProgress()/MONTHLY_GOAL/computePaceDeviation() —
// no new store, no second source of truth.
//
// All duration text in this card is rounded to the nearest 5 minutes for
// DISPLAY ONLY via formatHMRounded() — the underlying monthProgress() values
// (hoursDone/hoursRemaining/requiredPerDay) stay exact and are never mutated.
export function HoursHeroCard() {
  const { records, sessions } = useStore();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const p = monthProgress(records, now, sessions);
  const hasGoal = MONTHLY_GOAL > 0;
  const pctRaw = hasGoal ? (p.hoursDone / MONTHLY_GOAL) * 100 : 0;
  const pctClamped = Math.max(0, Math.min(100, pctRaw));

  const monthYearLabel = `${MONTHS_NOM[now.getMonth()]} ${year}`;
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  // Pace-deviation label (TASK_015, kept): still uses the current month's
  // real hoursDone/goal/daysInMonth/current day — unrelated to the bar
  // above it, which only shows pctClamped.
  const deviation = computePaceDeviation(p.hoursDone, MONTHLY_GOAL, p.daysInMonth, now.getDate());
  const deviationLabel = formatDeviationLabel(deviation);
  const deviationColor =
    deviation.status === "ahead" ? DS.greenInk : deviation.status === "behind" ? DS.danger : DS.metaText;

  const remainingText = !hasGoal
    ? "—"
    : p.hoursRemaining > 0
      ? formatHMRounded(p.hoursRemaining)
      : "Цель достигнута";
  const daysLeft = Math.max(0, p.daysLeft);
  const daysText = `${daysLeft} ${dayWord(daysLeft)}`;

  const a11yLabel = hasGoal
    ? `${monthYearLabel}: внесено ${formatHMRounded(p.hoursDone)} из цели ${formatHoursWord(MONTHLY_GOAL)}. Выполнено ${Math.round(pctRaw)} процентов. ${p.hoursRemaining > 0 ? `Осталось ${formatHMRounded(p.hoursRemaining)}.` : "Цель достигнута."} ${daysText} до конца месяца. ${deviationLabel}.`
    : `${monthYearLabel}: внесено ${formatHMRounded(p.hoursDone)}. Месячная цель не задана.`;

  return (
    <View style={styles.card}>
      <View accessible accessibilityLabel={a11yLabel}>
        <View style={styles.top}>
          <View style={styles.left}>
            <Text style={styles.total} importantForAccessibility="no">{formatHMRounded(p.hoursDone)}</Text>
            <Text style={styles.sub} importantForAccessibility="no">
              {hasGoal ? `из цели ${formatHoursWord(MONTHLY_GOAL)}` : "Месячная цель не задана"}
            </Text>
          </View>

          {hasGoal && <HeroProgressRing pct={pctRaw} size={48} />}
        </View>

        {hasGoal && (
          <View style={styles.track} importantForAccessibility="no">
            <View style={[styles.fill, { width: `${pctClamped}%` }]} />
          </View>
        )}

        {hasGoal && (
          <Text style={[styles.deviationText, { color: deviationColor }]} importantForAccessibility="no">
            {deviationLabel}
          </Text>
        )}
      </View>

      {hasGoal && (
        <View style={styles.statsRow} importantForAccessibility="no">
          <View style={styles.statsDivider} />
          <View style={styles.statsGrid}>
            <View style={styles.statCol}>
              <StatItem icon={<ClockIcon size={16} color={DS.accent} />} label="Осталось" value={remainingText} />
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <StatItem icon={<CalendarIcon size={16} color={DS.teal} />} label="До конца" value={daysText} />
            </View>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Детали месяца"
          hitSlop={8}
          onPress={() => router.push(`/hours/month/${monthKey}` as any)}
          style={({ pressed }) => [styles.detailsBtn, pressed && styles.pressed]}
        >
          <Text style={styles.detailsText}>Детали</Text>
          <Text style={styles.detailsChevron}>›</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Добавить часы"
          hitSlop={8}
          onPress={() => router.push("/hours/entry" as any)}
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
        >
          <PlusIcon size={14} color={DS.accent} />
          <Text style={styles.addBtnText}>Добавить</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DS.cardBg,
    borderRadius: 22,
    padding: 18,
    shadowColor: DS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  top: { flexDirection: "row", alignItems: "center", gap: 10 },
  left: { flex: 1 },
  total: { fontSize: 24, fontWeight: "700", color: DS.navy, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: DS.subText, fontWeight: "600", marginTop: 1 },
  track: { height: 6, borderRadius: 3, backgroundColor: DS.ringTrack, marginTop: 16, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3, backgroundColor: DS.accent },
  deviationText: { fontSize: 13, fontWeight: "700", marginTop: 8, textAlign: "left" },
  statsRow: { marginTop: 14, gap: 12 },
  statsDivider: { height: StyleSheet.hairlineWidth, backgroundColor: DS.divider },
  // Two equal-width (flex: 1) columns around a vertical divider (TASK_028,
  // was justifyContent: space-between with unequal natural-width items) —
  // the divider sits exactly in the middle because both neighbors are
  // guaranteed the same width, not because of a fixed margin.
  statsGrid: { flexDirection: "row", alignItems: "center" },
  statCol: { flex: 1, alignItems: "center" },
  statDivider: { width: StyleSheet.hairlineWidth, height: 34, backgroundColor: DS.divider },
  statItem: { flexDirection: "row", alignItems: "center", gap: 7, flexShrink: 1 },
  statText: { flexShrink: 1 },
  statLabel: { fontSize: 12, color: DS.metaText, fontWeight: "600" },
  statValue: { fontSize: 16, color: DS.navy, fontWeight: "700", marginTop: 1 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18 },
  pressed: { opacity: 0.85 },
  detailsBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  detailsText: { fontSize: 15, color: DS.subText, fontWeight: "700" },
  detailsChevron: { fontSize: 17, color: DS.chevron, fontWeight: "700" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: DS.heroBg,
  },
  addBtnText: { fontSize: 14, fontWeight: "700", color: DS.accent },
});
