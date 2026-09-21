// TASK_081 — a short label / value list inside a StatsCard (the lifetime
// «Кратко» facts, the month detail summary). Static rows, hairline
// separators, value right-aligned in tabular digits.
import { StyleSheet, Text, View } from "react-native";
import { DS } from "@/components/dashboard/tokens";
import { useThemedStyles } from "@/theme";

export type FactRow = { key: string; label: string; value: string; sub?: string | null };

export function FactRows({ rows }: { rows: FactRow[] }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View>
      {rows.map((r, i) => (
        <View
          key={r.key}
          style={[styles.row, i < rows.length - 1 && styles.divider]}
          accessible
          accessibilityLabel={`${r.label}: ${r.value}${r.sub ? `, ${r.sub}` : ""}`}
          testID={`fact-${r.key}`}
        >
          <Text style={styles.label} numberOfLines={2}>
            {r.label}
          </Text>
          <View style={styles.valueWrap}>
            <Text style={styles.value} numberOfLines={1}>
              {r.value}
            </Text>
            {r.sub ? (
              <Text style={styles.sub} numberOfLines={1}>
                {r.sub}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, minHeight: 50 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: DS.divider },
  label: { flex: 1, fontSize: 15, fontWeight: "500", color: DS.subInk },
  valueWrap: { alignItems: "flex-end", maxWidth: "60%" },
  value: { fontSize: 16, fontWeight: "700", color: DS.navy, fontVariant: ["tabular-nums"] },
  sub: { fontSize: 12, fontWeight: "500", color: DS.subInk, marginTop: 1 },
});
