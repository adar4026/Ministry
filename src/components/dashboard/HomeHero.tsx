import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useStore } from "@/store/StoreContext";
import { dayWord, formatHMRounded, formatHoursWord, monthProgress } from "@/data/constants";
import { effectiveMonthlyGoal, isHoursMode } from "@/data/ministryMode";
import { computePaceDeviation, formatDeviationLabel } from "@/data/cumulativeProgress";
import { CalendarIcon, ChevronRightIcon, ClockIcon, PlusIcon } from "@/components/icons";
import { DS, MINISTRY } from "./tokens";
import { GlassFigure, HERO, PILL_GLASS, splitDuration } from "./heroFigure";
import { PublisherHero } from "./PublisherHero";

// Re-exported: the glass-figure contract is tested through this module.
export { figureGlassStyles, splitDuration, type GlassLayer } from "./heroFigure";
// TASK_065 — the Home hero's CONTENT, laid out directly on HeroScene's
// background. This replaces HoursHeroCard on Home: same numbers, same two
// routes ("Детали" → /hours/month/[key], "Добавить часы" → /entry, never the
// tab bar's global /add), but no white card around them. Structure, top to
// bottom: the one headline figure → its caption → a thin progress line →
// pace status → two small metrics → two light glass pills. Everything reads
// through useStore()/monthProgress()/computePaceDeviation() — no new source
// of truth.
//
// TASK_070 — the "СЕНТЯБРЬ 2026" eyebrow is gone (the header's date line
// already says the month) and the figure took its place as the hero's one
// CENTRED element: a full-width wrapper centres "37 ч" on the screen while
// everything else (caption, progress, pace, metrics, pills) keeps the left
// grid — a dashboard KPI, not another line of text. The figure is number +
// unit on one baseline: the number large but a medium weight (600, not a
// heavy 700/800) in the system rounded face where the platform has one
// (SF Rounded on iOS via `ui-rounded`; no font dependency), the unit
// ("ч"/"м") small, weight 500, secondary ink, tucked right against the
// digits. formatHMRounded() is still the single source of the string;
// splitDuration() only breaks it into (number, unit) pairs for layout.
//
// Text sits on an animated background: the headline is frosted glass
// (TASK_071, see figureGlassStyles below — its legibility comes from the
// soft teal shadow under the light glyphs, not from a dark ink), and every
// caption uses MINISTRY.ink2 (4.65:1 even on a fully saturated crest) — never
// the DS.subInk/metaText greys, which drop below AA here.
// All durations are display-rounded via formatHMRounded(); the underlying
// monthProgress() values are never mutated.

// Month names are now only spoken (accessibilityLabel), never shown.
const MONTHS_NOM = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

// TASK_073 — the hero's CONTENT LAYER follows the ministry mode. The scene
// behind it (HeroScene / WebGL silk) is untouched either way: pioneers and
// special pioneers get the hours figures below, publishers get
// PublisherHero (days of participation + the month's mini calendar). Both
// share GlassFigure / HERO pills from heroFigure.tsx.
export function HomeHero() {
  const { settings } = useStore();
  if (!isHoursMode(settings.ministryMode)) return <PublisherHero />;
  return <HoursHero />;
}

function HoursHero() {
  const { records, sessions, settings } = useStore();
  // The user's own goal (mj_settings_v1) — 50 for an install that predates it.
  const goal = effectiveMonthlyGoal(settings);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const p = monthProgress(records, now, sessions, goal);
  const hasGoal = goal > 0;
  const pctRaw = hasGoal ? (p.hoursDone / goal) * 100 : 0;
  const pctClamped = Math.max(0, Math.min(100, pctRaw));
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const eyebrow = `${MONTHS_NOM[now.getMonth()]} ${year}`;

  const deviation = computePaceDeviation(p.hoursDone, goal, p.daysInMonth, now.getDate());
  const deviationLabel = formatDeviationLabel(deviation);
  const deviationColor =
    deviation.status === "ahead" ? DS.successInk : deviation.status === "behind" ? DS.danger : MINISTRY.ink2;

  const remainingText = !hasGoal
    ? "—"
    : p.hoursRemaining > 0
      ? formatHMRounded(p.hoursRemaining)
      : "Цель достигнута";
  const daysLeft = Math.max(0, p.daysLeft);
  const daysText = `${daysLeft} ${dayWord(daysLeft)}`;
  const caption = hasGoal
    ? `из цели ${formatHoursWord(goal)} · ${Math.round(pctRaw)}% выполнено`
    : "Месячная цель не задана";

  const pairs = splitDuration(formatHMRounded(p.hoursDone));

  const a11yLabel = hasGoal
    ? `${eyebrow}: внесено ${formatHMRounded(p.hoursDone)} из цели ${formatHoursWord(goal)}. Выполнено ${Math.round(pctRaw)} процентов. ${p.hoursRemaining > 0 ? `Осталось ${formatHMRounded(p.hoursRemaining)}.` : "Цель достигнута."} ${daysText} до конца месяца. ${deviationLabel}.`
    : `${eyebrow}: внесено ${formatHMRounded(p.hoursDone)}. Месячная цель не задана.`;

  return (
    <View style={styles.wrap} testID="home-hero">
      <View accessible accessibilityLabel={a11yLabel}>
        <GlassFigure pairs={pairs} />
        <Text style={styles.caption} importantForAccessibility="no">{caption}</Text>

        {hasGoal && (
          <View style={styles.track} importantForAccessibility="no">
            <View style={[styles.fill, { width: `${pctClamped}%` }]} />
          </View>
        )}

        {hasGoal && (
          <Text style={[styles.pace, { color: deviationColor }]} importantForAccessibility="no">
            {deviationLabel}
          </Text>
        )}
      </View>

      {hasGoal && (
        <View style={styles.metrics} importantForAccessibility="no">
          <View style={styles.metric}>
            <ClockIcon size={14} color={MINISTRY.primary} />
            <Text style={styles.metricLabel}>Осталось</Text>
            <Text style={styles.metricValue} numberOfLines={1}>{remainingText}</Text>
          </View>
          <View style={styles.metric}>
            <CalendarIcon size={14} color={MINISTRY.primary} />
            <Text style={styles.metricLabel}>До конца</Text>
            <Text style={styles.metricValue} numberOfLines={1}>{daysText}</Text>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Детали месяца"
          hitSlop={8}
          onPress={() => router.push(`/hours/month/${monthKey}` as any)}
          style={({ pressed }) => [styles.pill, PILL_GLASS, pressed && styles.pressed]}
        >
          <Text style={styles.pillText}>Детали</Text>
          <ChevronRightIcon size={14} color={MINISTRY.primary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Добавить часы"
          hitSlop={8}
          onPress={() => router.push("/entry" as any)}
          style={({ pressed }) => [styles.pill, styles.pillPrimary, PILL_GLASS, pressed && styles.pressed]}
        >
          <PlusIcon size={13} color={MINISTRY.primary} />
          {/* Explicitly "Добавить часы", not "Добавить": the tab bar's centre
              "+" is the global add (/add). This one only adds hours (/entry). */}
          <Text style={styles.pillText}>Добавить часы</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // No top padding: the header→hero distance is the screen's heroBlock gap
  // (index.tsx), so the figure sits right under the date line (TASK_070).
  wrap: { paddingTop: 0, gap: 0 },
  caption: HERO.caption,
  track: {
    marginTop: 14,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.55)",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 3, backgroundColor: MINISTRY.accent },
  pace: { marginTop: 8, fontSize: 13, lineHeight: 17, fontWeight: "700" },
  metrics: { flexDirection: "row", flexWrap: "wrap", columnGap: 18, rowGap: 6, marginTop: 14 },
  metric: { flexDirection: "row", alignItems: "center", gap: 5 },
  metricLabel: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: MINISTRY.ink2 },
  metricValue: { fontSize: 14, lineHeight: 18, fontWeight: "800", color: MINISTRY.ink },
  actions: HERO.actions,
  pill: HERO.pill,
  pillPrimary: HERO.pillPrimary,
  pillText: HERO.pillText,
  pressed: HERO.pressed,
});
