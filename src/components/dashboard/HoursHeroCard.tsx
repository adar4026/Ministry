import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useStore } from "@/store/StoreContext";
import { MONTHLY_GOAL, dayWord, formatHMRounded, formatHoursWord, monthProgress } from "@/data/constants";
import { computePaceDeviation, formatDeviationLabel } from "@/data/cumulativeProgress";
import { CalendarIcon, ChevronRightIcon, ClockIcon, PlusIcon } from "@/components/icons";
import { DS } from "./tokens";

// Nominative month names, used only in the spoken accessibility label (no
// visible month/year text in this card as of TASK_015 — see below).
const MONTHS_NOM = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

// One "Осталось 17 ч" / "До конца 12 дней" figure. Single-line (TASK_048,
// was a hard-stacked label-over-value pair): the two lines were the largest
// single block of vertical slack in the card, and at this type size the
// label and the value read perfectly well on one baseline.
//
// `stacked` restores the label-over-value form on the narrowest iPhones,
// where "До конца 12 дней" is simply wider than half the card. Deciding it
// from the window width (rather than letting each item wrap on its own)
// keeps the two columns symmetric — one column wrapping while its neighbor
// stays on a single line is exactly the ugly break this task asks to avoid.
function StatItem({
  icon,
  label,
  value,
  stacked,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  stacked: boolean;
}) {
  return (
    <View style={stacked ? styles.statItemStacked : styles.statItem}>
      <View style={styles.statHead}>
        {icon}
        <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {value}
      </Text>
    </View>
  );
}

// Below this width the two stat columns cannot both hold an icon + label +
// value on one line (320pt iPhone SE class). Not a device check — purely the
// point at which this card's own content stops fitting.
const STAT_STACK_BREAKPOINT = 360;

// Home monthly-progress card ("Ministry Calm" redesign, TASK_014; pace-
// deviation label TASK_015 — see docs/TASKS/TASK_015_HOME_MONTHLY_PACE_STATUS.md).
// A cumulative line-chart direction was prototyped and implemented for this
// card, then rejected in favor of keeping the original horizontal progress
// bar with the new pace-status label added below it (see that doc's
// "Rejected direction" section). Sole purpose is to communicate progress
// toward the monthly goal. Starting ministry (the timer) lives on the Hours
// screen; the "Добавить часы" pill here routes to the existing Manual Time
// Entry screen (`/entry`, TASK_005B), not the timer, and not to the tab
// bar's global "+" (`/add`, which adds a month record / event / talk) —
// see TASK_048 §2.5. "Детали" reuses the existing Month Details route
// (`/hours/month/[key]`); the entry route itself moved to `/entry`
// (root-level, TASK_030 follow-up). Reads only through useStore()/
// monthProgress()/MONTHLY_GOAL/computePaceDeviation() — no new store, no
// second source of truth.
//
// TASK_048: the progress ring (HeroProgressRing) was removed from this card.
// It and the horizontal bar rendered the exact same percentage — one number,
// two graphics. The bar is now the single graphical progress indicator and
// the percentage is stated as text ("66% выполнено") next to the headline
// figure. HeroProgressRing itself is untouched and still exported from the
// dashboard library, exactly like GoalRing.
//
// All duration text in this card is rounded to the nearest 5 minutes for
// DISPLAY ONLY via formatHMRounded() — the underlying monthProgress() values
// (hoursDone/hoursRemaining/requiredPerDay) stay exact and are never mutated.
export function HoursHeroCard() {
  const { records, sessions } = useStore();
  const { width } = useWindowDimensions();
  const stackStats = width < STAT_STACK_BREAKPOINT;
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
  // TASK_048: AA-contrast semantic tokens (successInk/danger/subInk) replace
  // greenInk/danger/metaText — green only ever means a real "ahead", behind
  // keeps the warning red, and "on plan" is neutral. The math behind
  // `deviation.status` is untouched.
  const deviationColor =
    deviation.status === "ahead" ? DS.successInk : deviation.status === "behind" ? DS.danger : DS.subInk;

  const remainingText = !hasGoal
    ? "—"
    : p.hoursRemaining > 0
      ? formatHMRounded(p.hoursRemaining)
      : "Цель достигнута";
  const daysLeft = Math.max(0, p.daysLeft);
  const daysText = `${daysLeft} ${dayWord(daysLeft)}`;
  const pctText = `${Math.round(pctRaw)}% выполнено`;

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

          {/* The percentage now lives next to the headline figure as text —
              the bar below is the only graphic. */}
          {hasGoal && (
            <Text style={styles.pct} numberOfLines={1} importantForAccessibility="no">
              {pctText}
            </Text>
          )}
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
              <StatItem
                icon={<ClockIcon size={15} color={DS.accent} />}
                label="Осталось"
                value={remainingText}
                stacked={stackStats}
              />
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <StatItem
                icon={<CalendarIcon size={15} color={DS.teal} />}
                label="До конца"
                value={daysText}
                stacked={stackStats}
              />
            </View>
          </View>
        </View>
      )}

      {/* Two distinct actions, each with its own hit area — the card itself
          is deliberately NOT pressable, so neither button competes with an
          invisible whole-card target (TASK_048 §2.5). */}
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Детали месяца"
          hitSlop={10}
          onPress={() => router.push(`/hours/month/${monthKey}` as any)}
          style={({ pressed }) => [styles.detailsBtn, pressed && styles.pressed]}
        >
          <Text style={styles.detailsText}>Детали</Text>
          <ChevronRightIcon size={15} color={DS.subInk} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Добавить часы"
          hitSlop={10}
          onPress={() => router.push("/entry" as any)}
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
        >
          <PlusIcon size={14} color={DS.accentInk} />
          {/* Explicitly "Добавить часы", not "Добавить": the tab bar's center
              "+" is the global add (/add). This one only ever adds hours to
              this goal (/entry). */}
          <Text style={styles.addBtnText}>Добавить часы</Text>
        </Pressable>
      </View>
    </View>
  );
}

// TASK_048 density pass. Every spacing value below was reduced, never
// replaced by a fixed height — the card still sizes itself from its content,
// so it stays adaptive to font scaling and narrow screens.
const styles = StyleSheet.create({
  card: {
    backgroundColor: DS.cardBg,
    borderRadius: 22,
    padding: 16,
    shadowColor: DS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  top: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  left: { flex: 1 },
  // Explicit lineHeight (was the platform default ~1.2em) — the headline
  // figure needs no leading of its own inside a card this tight.
  total: { fontSize: 24, lineHeight: 28, fontWeight: "700", color: DS.navy, letterSpacing: -0.5 },
  sub: { fontSize: 13, lineHeight: 17, color: DS.subInk, fontWeight: "600" },
  // Baseline-aligned with `sub` (both sit on the bottom of the row), so the
  // percentage reads as a caption of the headline figure, not as a second
  // heading competing with it.
  pct: { fontSize: 13, lineHeight: 17, fontWeight: "700", color: DS.subInk },
  track: { height: 6, borderRadius: 3, backgroundColor: DS.ringTrack, marginTop: 12, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3, backgroundColor: DS.accent },
  deviationText: { fontSize: 13, lineHeight: 17, fontWeight: "700", marginTop: 6, textAlign: "left" },
  statsRow: { marginTop: 12, gap: 10 },
  statsDivider: { height: StyleSheet.hairlineWidth, backgroundColor: DS.divider },
  // Two equal-width (flex: 1) columns around a vertical divider (TASK_028,
  // was justifyContent: space-between with unequal natural-width items) —
  // the divider sits exactly in the middle because both neighbors are
  // guaranteed the same width, not because of a fixed margin.
  statsGrid: { flexDirection: "row", alignItems: "center" },
  statCol: { flex: 1, alignItems: "center", paddingHorizontal: 6 },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: DS.divider },
  statItem: { flexDirection: "row", alignItems: "center", justifyContent: "center", columnGap: 6 },
  statItemStacked: { flexDirection: "column", alignItems: "center" },
  statHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  statLabel: { fontSize: 12, lineHeight: 20, color: DS.subInk, fontWeight: "600" },
  statValue: { fontSize: 15, lineHeight: 20, color: DS.navy, fontWeight: "700" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  pressed: { opacity: 0.85 },
  // hitSlop 10 on both buttons keeps the tappable area comfortably past the
  // 44pt guideline even though the visible pill is shorter than before.
  detailsBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 4 },
  detailsText: { fontSize: 15, color: DS.subInk, fontWeight: "700" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: DS.heroBg,
  },
  // DS.accentInk on DS.heroBg = 5.58:1; DS.accent on the same tint was
  // 3.96:1 — below AA for this 14px label (TASK_048).
  addBtnText: { fontSize: 14, fontWeight: "700", color: DS.accentInk },
});
