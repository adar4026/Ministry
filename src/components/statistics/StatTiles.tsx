// TASK_081 — «Кратко»: a 2 × 2 grid of small figures under the hero. Each
// tile is label / value / optional sub-line; the values are plain DS ink
// (no per-tile colour), so the grid reads as one quiet block.
import { StyleSheet, Text, View } from "react-native";
import { DS } from "@/components/dashboard/tokens";
import { useThemedStyles } from "@/theme";

export type StatTile = { key: string; label: string; value: string; sub?: string | null };

export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.grid} testID="stats-tiles">
      {tiles.map((t) => (
        <View key={t.key} style={styles.tile} accessible accessibilityLabel={`${t.label}: ${t.value}${t.sub ? `, ${t.sub}` : ""}`}>
          <Text style={styles.label} numberOfLines={2}>
            {t.label}
          </Text>
          <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {t.value}
          </Text>
          {t.sub ? (
            <Text style={styles.sub} numberOfLines={1}>
              {t.sub}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    // Two per row at every width from 320 px up: (width − 32 gutter − 10 gap) / 2.
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: 130,
    backgroundColor: DS.cardBg,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
    shadowColor: DS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  label: { fontSize: 12, fontWeight: "600", color: DS.subInk, minHeight: 16 },
  value: { fontSize: 22, lineHeight: 28, fontWeight: "700", color: DS.navy, letterSpacing: -0.3, fontVariant: ["tabular-nums"] },
  sub: { fontSize: 13, fontWeight: "500", color: DS.subInk },
});
