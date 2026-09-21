// TASK_081 — «По месяцам» / «По годам»: one row per period — label on the
// left, «34 ч 20 м» on the right, and a thin accent bar under them whose
// width is the period's share of the longest one (the longest = full
// width). A period with nothing recorded shows «—» and no bar. Rows with an
// `onPress` are tappable (month → month detail, year → that year's stats).
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DS, MINISTRY } from "@/components/dashboard/tokens";
import { ChevronRightIcon } from "@/components/icons";
import { formatStatMinutes } from "@/data/serviceStats";
import { useThemedStyles } from "@/theme";

export type BarRow = {
  key: string;
  label: string;
  minutes: number;
  sub?: string | null;
  onPress?: () => void;
  testID?: string;
};

export function BarRows({ rows, emphasizeKey }: { rows: BarRow[]; emphasizeKey?: string | null }) {
  const styles = useThemedStyles(makeStyles);
  const max = Math.max(0, ...rows.map((r) => r.minutes));

  return (
    <View>
      {rows.map((r, i) => {
        const empty = r.minutes <= 0;
        const share = max > 0 && !empty ? Math.max(0.02, r.minutes / max) : 0;
        const em = emphasizeKey === r.key;
        const body = (
          <>
            <View style={styles.line}>
              <View style={styles.labelWrap}>
                <Text style={[styles.label, em && styles.labelEm, empty && styles.labelEmpty]} numberOfLines={1}>
                  {r.label}
                </Text>
                {r.sub ? (
                  <Text style={styles.sub} numberOfLines={1}>
                    {r.sub}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.value, empty && styles.valueEmpty]} numberOfLines={1}>
                {empty ? "—" : formatStatMinutes(r.minutes)}
              </Text>
              {r.onPress && !empty ? <ChevronRightIcon size={16} color={DS.chevron} /> : <View style={styles.chevronSpace} />}
            </View>
            <View style={[styles.track, empty && styles.trackEmpty]}>
              {share > 0 && <View style={[styles.bar, { width: `${Math.round(share * 1000) / 10}%` }, em && styles.barEm]} />}
            </View>
          </>
        );
        const rowStyle = [styles.row, i < rows.length - 1 && styles.divider];
        if (r.onPress && !empty) {
          return (
            <Pressable
              key={r.key}
              onPress={r.onPress}
              accessibilityRole="button"
              accessibilityLabel={`${r.label}: ${formatStatMinutes(r.minutes)}`}
              style={({ pressed }) => [rowStyle, pressed && styles.pressed]}
              testID={r.testID}
            >
              {body}
            </Pressable>
          );
        }
        return (
          <View key={r.key} style={rowStyle} accessible accessibilityLabel={`${r.label}: ${empty ? "нет записей" : formatStatMinutes(r.minutes)}`} testID={r.testID}>
            {body}
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  row: { paddingHorizontal: 16, paddingTop: 11, paddingBottom: 12, gap: 7 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: DS.divider },
  pressed: { backgroundColor: DS.pressedBg },
  line: { flexDirection: "row", alignItems: "center", gap: 8 },
  labelWrap: { flex: 1, minWidth: 0 },
  label: { fontSize: 16, fontWeight: "600", color: DS.navy },
  labelEm: { fontWeight: "700" },
  labelEmpty: { color: DS.subInk, fontWeight: "500" },
  sub: { fontSize: 12, fontWeight: "500", color: DS.subInk, marginTop: 1 },
  value: { fontSize: 15, fontWeight: "600", color: DS.navy, fontVariant: ["tabular-nums"] },
  valueEmpty: { color: DS.chevron },
  chevronSpace: { width: 16 },
  track: { height: 5, borderRadius: 3, backgroundColor: DS.ringTrack, overflow: "hidden" },
  // An empty period keeps the row height but shows no track — no grey
  // "zero bar" noise down a mostly-empty year.
  trackEmpty: { backgroundColor: "transparent" },
  bar: { height: 5, borderRadius: 3, backgroundColor: MINISTRY.accent, opacity: 0.85 },
  barEm: { opacity: 1 },
});
