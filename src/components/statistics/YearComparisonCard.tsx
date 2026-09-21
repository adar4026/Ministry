// TASK_081 — «Сравнение»: this service year beside the previous one
// («2025–2026» / «2024–2025», TASK_082), and the plain signed difference
// («+37 ч», «+9,5 %»). Deliberately neutral — figures only, no "better /
// worse" wording, no colour judgement on the delta.
import { StyleSheet, Text, View } from "react-native";
import { DS } from "@/components/dashboard/tokens";
import { formatSignedMinutes, formatSignedPercent, formatStatMinutes, type YearComparison } from "@/data/serviceStats";
import { serviceYearLabel } from "@/data/serviceYear";
import { useThemedStyles } from "@/theme";

export function YearComparisonCard({ comparison }: { comparison: YearComparison }) {
  const styles = useThemedStyles(makeStyles);
  const c = comparison;
  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={`Сравнение: ${serviceYearLabel(c.year)} — ${formatStatMinutes(c.minutes)}, ${serviceYearLabel(c.prevYear)} — ${formatStatMinutes(c.prevMinutes)}, разница ${formatSignedMinutes(c.deltaMinutes)}`}
      testID="stats-comparison"
    >
      <View style={styles.columns}>
        <View style={styles.col}>
          <Text style={styles.year}>{serviceYearLabel(c.year)}</Text>
          <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {formatStatMinutes(c.minutes)}
          </Text>
        </View>
        <View style={styles.vline} />
        <View style={styles.col}>
          <Text style={styles.year}>{serviceYearLabel(c.prevYear)}</Text>
          <Text style={[styles.value, styles.valuePrev]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {formatStatMinutes(c.prevMinutes)}
          </Text>
        </View>
      </View>
      <View style={styles.delta}>
        <Text style={styles.deltaValue} testID="stats-comparison-delta">
          {formatSignedMinutes(c.deltaMinutes)}
        </Text>
        {c.deltaPercent !== null && <Text style={styles.deltaPercent}>{formatSignedPercent(c.deltaPercent)}</Text>}
      </View>
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  wrap: { gap: 12 },
  columns: { flexDirection: "row", alignItems: "stretch" },
  col: { flex: 1, gap: 2, alignItems: "center" },
  vline: { width: StyleSheet.hairlineWidth, backgroundColor: DS.divider, marginVertical: 2 },
  year: { fontSize: 13, fontWeight: "600", color: DS.subInk, fontVariant: ["tabular-nums"] },
  value: { fontSize: 22, fontWeight: "700", color: DS.navy, letterSpacing: -0.3, fontVariant: ["tabular-nums"] },
  valuePrev: { color: DS.subInk, fontWeight: "600" },
  delta: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DS.divider,
    paddingTop: 12,
  },
  deltaValue: { fontSize: 17, fontWeight: "700", color: DS.navy, fontVariant: ["tabular-nums"] },
  deltaPercent: { fontSize: 14, fontWeight: "600", color: DS.subInk, fontVariant: ["tabular-nums"] },
});
