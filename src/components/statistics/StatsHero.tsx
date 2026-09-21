// TASK_081 — the section's one big figure: «428 ч 15 м» with the number
// large and the unit small on a shared baseline (the Home hero's
// GlassFigure layout, without its frosted-glass layers — this is a card,
// not the wave scene), a caption under it and one quiet secondary line.
import { Platform, StyleSheet, Text, View } from "react-native";
import { DS, MINISTRY } from "@/components/dashboard/tokens";
import { durationPairs } from "@/data/serviceStats";
import { useThemedStyles } from "@/theme";

const FIGURE_FONT = Platform.select<object>({
  web: { fontFamily: 'ui-rounded, -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' },
  default: {},
});

export function StatsHero({
  eyebrow,
  minutes,
  caption,
  detail,
  accessibilityLabel,
}: {
  eyebrow: string;
  minutes: number;
  caption: string;
  detail?: string | null;
  accessibilityLabel: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const pairs = durationPairs(minutes);
  // «1 248 ч 45 м» (six digits) no longer fits the 56 pt figure inside a
  // 320 px card — step the whole row down one size instead of clipping.
  const compact = pairs.reduce((n, [num]) => n + num.replace(/\D/g, "").length, 0) >= 6;
  return (
    <View style={styles.card} accessible accessibilityLabel={accessibilityLabel} testID="stats-hero">
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <View style={styles.figure} testID="stats-hero-figure">
        {pairs.map(([num, unit], i) => (
          <View key={i} style={[styles.pair, i > 0 && styles.pairNext]}>
            <Text style={[styles.number, compact && styles.numberCompact, FIGURE_FONT]} numberOfLines={1}>
              {num}
            </Text>
            <Text style={[styles.unit, compact && styles.unitCompact, FIGURE_FONT]}>{unit}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.caption}>{caption}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  card: {
    backgroundColor: DS.cardBg,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    alignItems: "center",
    shadowColor: DS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  eyebrow: { fontSize: 13, fontWeight: "600", color: DS.subInk, letterSpacing: 0.3 },
  figure: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", flexWrap: "nowrap", marginTop: 4 },
  pair: { flexDirection: "row", alignItems: "baseline" },
  pairNext: { marginLeft: 10 },
  number: {
    fontSize: 56,
    lineHeight: 62,
    fontWeight: "600",
    letterSpacing: -1.5,
    color: DS.navy,
    fontVariant: ["tabular-nums"],
  },
  numberCompact: { fontSize: 44, lineHeight: 50, letterSpacing: -1 },
  unit: { marginLeft: 3, fontSize: 22, lineHeight: 28, fontWeight: "500", color: MINISTRY.primary },
  unitCompact: { fontSize: 18, lineHeight: 24 },
  caption: { marginTop: 2, fontSize: 15, fontWeight: "600", color: DS.navy },
  detail: { marginTop: 4, fontSize: 13, fontWeight: "500", color: DS.subInk },
});
