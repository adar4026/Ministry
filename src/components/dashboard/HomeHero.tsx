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
// bottom: the one headline figure → its caption → a thin progress line →
// pace status → two small metrics → two light glass pills. Everything reads
// through useStore()/monthProgress()/computePaceDeviation() — no new source
// of truth.
//
// TASK_070 — the "СЕНТЯБРЬ 2026" eyebrow is gone (the header's date line
// already says the month) and the figure moved up into its place: no top
// padding of its own, the header→hero gap is the screen's (index.tsx). The
// figure is set as number + unit on one baseline — the number large and a
// weight lighter than before, the unit ("ч"/"м") smaller, lighter and in
// the secondary ink — so "37 ч" reads like an iOS dashboard headline, not
// a bold label. formatHMRounded() is still the single source of the string;
// splitDuration() only breaks it into (number, unit) pairs for layout.
//
// Text sits on an animated background, so the headline ink is
// MINISTRY.ink (>= 6.8:1 even on a fully saturated crest) with a faint light
// text shadow, and every caption uses MINISTRY.ink2 (4.65:1 on that same
// worst case) — never the DS.subInk/metaText greys, which drop below AA here.
// All durations are display-rounded via formatHMRounded(); the underlying
// monthProgress() values are never mutated.

// Month names are now only spoken (accessibilityLabel), never shown.
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

/**
 * "1 ч 30 м" → [["1", "ч"], ["30", "м"]]; "37 ч" → [["37", "ч"]]. Pure
 * layout helper for the headline — the string itself comes unchanged from
 * formatHMRounded(). Anything that does not match (e.g. "—") comes back as
 * a single number-less pair so it still renders.
 */
export function splitDuration(text: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  const re = /(\d+)\s*([^\d\s]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) pairs.push([m[1], m[2]]);
  return pairs.length ? pairs : [[text, ""]];
}

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
        {/* A baseline-aligned row rather than nested Text: mixed font sizes
            inside one Text stretch the line box (each size gets its own
            half-leading), while a row gives an exact 60 pt height and puts
            the small unit on the number's baseline on native and web. */}
        <View style={styles.figure} importantForAccessibility="no" testID="home-hero-figure">
          {splitDuration(formatHMRounded(p.hoursDone)).map(([num, unit], i) => (
            <View key={i} style={[styles.figurePair, i > 0 && styles.figurePairNext]}>
              <Text style={[styles.figureNumber, FIGURE_SHADOW]} numberOfLines={1}>{num}</Text>
              {unit ? <Text style={[styles.figureUnit, FIGURE_SHADOW]} numberOfLines={1}>{unit}</Text> : null}
            </View>
          ))}
        </View>
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
  // No top padding: the header→hero distance is the screen's heroBlock gap
  // (index.tsx), so the figure sits right under the date line (TASK_070).
  wrap: { paddingTop: 0, gap: 0 },
  // The whole "37 ч" / "1 ч 30 м" run: pairs of (number, unit) on one
  // baseline, exactly one 60 pt line tall.
  figure: { flexDirection: "row", alignItems: "baseline", flexWrap: "nowrap" },
  figurePair: { flexDirection: "row", alignItems: "baseline" },
  figurePairNext: { marginLeft: 10 },
  // The number: bigger than before (46 → 56) and one weight lighter
  // (800 → 700) — large, clean, not heavy. Tight tracking keeps two digits
  // from reading as wide; tabular digits keep the width steady as it grows.
  figureNumber: {
    fontSize: 56,
    lineHeight: 60,
    fontWeight: "700",
    letterSpacing: -1.6,
    color: MINISTRY.ink,
    fontVariant: ["tabular-nums"],
  },
  // The unit ("ч", "м"): clearly secondary — less than half the size, a
  // weight lighter, the secondary ink — sitting on the number's baseline.
  figureUnit: {
    marginLeft: 5,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
    letterSpacing: -0.2,
    color: MINISTRY.ink2,
  },
  caption: { marginTop: 4, fontSize: 14, lineHeight: 18, fontWeight: "600", color: MINISTRY.ink2 },
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
