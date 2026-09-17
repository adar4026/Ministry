import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useStore } from "@/store/StoreContext";
import { MONTHLY_GOAL, dayWord, formatHMRounded, formatHoursWord, monthProgress } from "@/data/constants";
import { computePaceDeviation, formatDeviationLabel } from "@/data/cumulativeProgress";
import { CalendarIcon, ChevronRightIcon, ClockIcon, PlusIcon } from "@/components/icons";
import { DS, MINISTRY } from "./tokens";

// TASK_065 — the Home hero's CONTENT, laid out directly on HeroScene's
// background. This replaces HoursHeroCard on Home: same numbers, same two
// routes ("Детали" → /hours/month/[key], "Добавить часы" → /entry, never the
// tab bar's global /add), but no white card around them. Structure, top to
// bottom: eyebrow (month + year) → the one headline figure → its caption →
// a thin progress line → pace status → two small metrics → two light glass
// pills. Everything reads through useStore()/monthProgress()/
// computePaceDeviation() — no new source of truth.
//
// Text sits on an animated background, so the headline ink is
// MINISTRY.ink (>= 6.8:1 even on a fully saturated crest) with a faint light
// text shadow, and every caption uses MINISTRY.ink2 (4.65:1 on that same
// worst case) — never the DS.subInk/metaText greys, which drop below AA here.
// All durations are display-rounded via formatHMRounded(); the underlying
// monthProgress() values are never mutated.

const MONTHS_NOM = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

// A faint light halo under the headline, as in both reference apps. RNW 0.21
// deprecates the textShadow* props in favour of the CSS shorthand, so web
// gets the shorthand and native keeps the props — no console warning either way.
const FIGURE_SHADOW = Platform.select<object>({
  web: { textShadow: "0 1px 0 rgba(255,255,255,0.35)" },
  default: {
    textShadowColor: "rgba(255,255,255,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
});

// Very light glass for the two pills: translucent white, a touch of blur on
// web, no border — enough to lift the label off a passing wave, not enough
// to read as a container.
const GLASS = Platform.select<object>({
  web: { backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" },
  default: {},
});

export function HomeHero() {
  const { records, sessions } = useStore();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const p = monthProgress(records, now, sessions);
  const hasGoal = MONTHLY_GOAL > 0;
  const pctRaw = hasGoal ? (p.hoursDone / MONTHLY_GOAL) * 100 : 0;
  const pctClamped = Math.max(0, Math.min(100, pctRaw));
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const eyebrow = `${MONTHS_NOM[now.getMonth()]} ${year}`;

  const deviation = computePaceDeviation(p.hoursDone, MONTHLY_GOAL, p.daysInMonth, now.getDate());
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
    ? `из цели ${formatHoursWord(MONTHLY_GOAL)} · ${Math.round(pctRaw)}% выполнено`
    : "Месячная цель не задана";

  const a11yLabel = hasGoal
    ? `${eyebrow}: внесено ${formatHMRounded(p.hoursDone)} из цели ${formatHoursWord(MONTHLY_GOAL)}. Выполнено ${Math.round(pctRaw)} процентов. ${p.hoursRemaining > 0 ? `Осталось ${formatHMRounded(p.hoursRemaining)}.` : "Цель достигнута."} ${daysText} до конца месяца. ${deviationLabel}.`
    : `${eyebrow}: внесено ${formatHMRounded(p.hoursDone)}. Месячная цель не задана.`;

  return (
    <View style={styles.wrap} testID="home-hero">
      <View accessible accessibilityLabel={a11yLabel}>
        <Text style={styles.eyebrow} importantForAccessibility="no">{eyebrow}</Text>
        <Text style={styles.figure} importantForAccessibility="no" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {formatHMRounded(p.hoursDone)}
        </Text>
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
          style={({ pressed }) => [styles.pill, GLASS, pressed && styles.pressed]}
        >
          <Text style={styles.pillText}>Детали</Text>
          <ChevronRightIcon size={14} color={MINISTRY.primary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Добавить часы"
          hitSlop={8}
          onPress={() => router.push("/entry" as any)}
          style={({ pressed }) => [styles.pill, styles.pillPrimary, GLASS, pressed && styles.pressed]}
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
  wrap: { paddingTop: 18, gap: 0 },
  eyebrow: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    color: MINISTRY.ink2,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  figure: {
    marginTop: 6,
    fontSize: 46,
    lineHeight: 52,
    fontWeight: "800",
    letterSpacing: -1.2,
    color: MINISTRY.ink,
    fontVariant: ["tabular-nums"],
    ...FIGURE_SHADOW,
  },
  caption: { marginTop: 2, fontSize: 14, lineHeight: 18, fontWeight: "600", color: MINISTRY.ink2 },
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
  actions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  pillPrimary: { backgroundColor: "rgba(255,255,255,0.72)" },
  pillText: { fontSize: 14, lineHeight: 18, fontWeight: "700", color: MINISTRY.primary },
  pressed: { opacity: 0.8 },
});
