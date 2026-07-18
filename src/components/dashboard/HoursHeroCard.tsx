import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useStore } from "@/store/StoreContext";
import { MONTHLY_GOAL, dayWord, formatHMRounded, formatHoursWord, monthProgress } from "@/data/constants";
import { CalendarIcon, ChartIcon, ClockIcon, PlusIcon } from "@/components/icons";
import { DS } from "./tokens";
import { GoalRing } from "./GoalRing";

// Nominative month names for the card's dynamic "ИЮЛЬ 2026" header (TASK_014)
// — distinct from Home header's genitive MONTHS_GEN (app/(tabs)/index.tsx),
// which needs "17 июля", not "июль 17". Uppercase is applied via CSS
// (textTransform), matching the label style already used elsewhere here.
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
        <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

// Home monthly-progress card ("Ministry Calm" redesign, TASK_014 — builds on
// the compact card introduced in TASK_010). Sole purpose is to communicate
// progress toward the monthly goal. Starting ministry (the timer) lives on
// the Hours screen; the "+ Добавить" pill here routes to the existing Manual
// Time Entry screen (`/hours/entry`, TASK_005B), not the timer. "Детали"
// reuses the existing Month Details route (`/hours/month/[key]`). Reads only
// through useStore()/monthProgress()/MONTHLY_GOAL — no new aggregation.
//
// All duration text in this card is rounded to the nearest 5 minutes for
// DISPLAY ONLY via formatHMRounded() — the underlying monthProgress() values
// (hoursDone/hoursRemaining/requiredPerDay) stay exact and are never mutated.
export function HoursHeroCard() {
  const { records, sessions } = useStore();
  const now = new Date();
  const p = monthProgress(records, now, sessions);
  const hasGoal = MONTHLY_GOAL > 0;
  const pctRaw = hasGoal ? (p.hoursDone / MONTHLY_GOAL) * 100 : 0;
  const pctClamped = Math.max(0, Math.min(100, pctRaw));

  const monthYearLabel = `${MONTHS_NOM[now.getMonth()]} ${now.getFullYear()}`;
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const remainingText = !hasGoal
    ? "—"
    : p.hoursRemaining > 0
      ? formatHMRounded(p.hoursRemaining)
      : "Цель достигнута";
  const daysLeft = Math.max(0, p.daysLeft);
  const daysText = `${daysLeft} ${dayWord(daysLeft)}`;
  // Once the goal is met, a required daily pace is no longer a meaningful
  // number — an em dash avoids implying "0 ч" still needs to be done.
  const paceText = !hasGoal || p.hoursRemaining <= 0 ? "—" : `${formatHMRounded(p.requiredPerDay)}/день`;

  const a11yLabel = hasGoal
    ? `${monthYearLabel}: внесено ${formatHMRounded(p.hoursDone)} из цели ${formatHoursWord(MONTHLY_GOAL)}. Выполнено ${Math.round(pctRaw)} процентов. ${p.hoursRemaining > 0 ? `Осталось ${formatHMRounded(p.hoursRemaining)}.` : "Цель достигнута."} ${daysText} до конца месяца.`
    : `${monthYearLabel}: внесено ${formatHMRounded(p.hoursDone)}. Месячная цель не задана.`;

  return (
    <View style={styles.card}>
      <View accessible accessibilityLabel={a11yLabel}>
        <Text style={styles.monthLabel} importantForAccessibility="no">{monthYearLabel}</Text>

        <View style={styles.top}>
          <View style={styles.left}>
            <Text style={styles.total} importantForAccessibility="no">{formatHMRounded(p.hoursDone)}</Text>
            <Text style={styles.sub} importantForAccessibility="no">
              {hasGoal ? `из цели ${formatHoursWord(MONTHLY_GOAL)}` : "Месячная цель не задана"}
            </Text>
          </View>

          {hasGoal && (
            <GoalRing pct={pctRaw} goalHours={MONTHLY_GOAL} size={72} showGoalLabel={false} tone="accent" />
          )}
        </View>

        {hasGoal && (
          <View style={styles.track} importantForAccessibility="no">
            <View style={[styles.fill, { width: `${pctClamped}%` }]} />
          </View>
        )}
      </View>

      {hasGoal && (
        <View style={styles.statsRow} importantForAccessibility="no">
          <View style={styles.statsTopRow}>
            <StatItem icon={<ClockIcon size={16} color={DS.metaText} />} label="Осталось" value={remainingText} />
            <StatItem icon={<CalendarIcon size={16} color={DS.metaText} />} value={daysText} />
          </View>
          {/* Its own full-width row: "X ч Y м/день" is the longest value in
              this card and needs more room than a 3-up columns would give it
              on narrow phones — the two-column-plus-wrapped-row layout the
              task brief allows for. */}
          <StatItem icon={<ChartIcon size={16} color={DS.metaText} />} label="В среднем" value={paceText} />
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
  monthLabel: { fontSize: 13, color: DS.metaText, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  top: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
  left: { flex: 1 },
  total: { fontSize: 30, fontWeight: "800", color: DS.navy, letterSpacing: -0.6 },
  sub: { fontSize: 14, color: DS.subText, fontWeight: "600", marginTop: 2 },
  track: { height: 6, borderRadius: 3, backgroundColor: DS.ringTrack, marginTop: 16, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3, backgroundColor: DS.accent },
  statsRow: { marginTop: 18, gap: 10 },
  statsTopRow: { flexDirection: "row", gap: 20 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  statText: { flexShrink: 1 },
  statLabel: { fontSize: 11, color: DS.metaText, fontWeight: "600" },
  statValue: { fontSize: 13, color: DS.navy, fontWeight: "700", marginTop: 1 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18 },
  pressed: { opacity: 0.85 },
  detailsBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  detailsText: { fontSize: 14, color: DS.subText, fontWeight: "700" },
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
  addBtnText: { fontSize: 13, fontWeight: "700", color: DS.accent },
});
