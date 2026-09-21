// TASK_081 — the period control under the «Статистика» header: a two-way
// segmented switch (Год / За всё время) and, in year mode, the ‹ 2026 ›
// stepper. The stepper is bounded by yearSwitcherBounds() — it stops at
// the earliest year with data on the left and at the current year on the
// right, so there is never a blank future year to page into.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DS, MINISTRY } from "@/components/dashboard/tokens";
import { ChevronRightIcon } from "@/components/icons";
import { useThemedStyles } from "@/theme";

export type StatsPeriodMode = "year" | "all";

export function YearSwitcher({
  mode,
  year,
  min,
  max,
  isCurrentYear,
  onModeChange,
  onYearChange,
}: {
  mode: StatsPeriodMode;
  year: number;
  min: number;
  max: number;
  isCurrentYear: boolean;
  onModeChange: (mode: StatsPeriodMode) => void;
  onYearChange: (year: number) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const canPrev = year > min;
  const canNext = year < max;

  return (
    <View style={styles.card} testID="stats-period">
      <View style={styles.segment} accessibilityRole="tablist">
        {(["year", "all"] as const).map((m) => {
          const on = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => onModeChange(m)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [styles.segBtn, on && styles.segBtnOn, pressed && styles.pressed]}
              testID={`stats-mode-${m}`}
            >
              <Text style={[styles.segText, on && styles.segTextOn]}>{m === "year" ? "Год" : "За всё время"}</Text>
            </Pressable>
          );
        })}
      </View>

      {mode === "year" && (
        <View style={styles.stepper}>
          <Pressable
            onPress={() => onYearChange(year - 1)}
            disabled={!canPrev}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Предыдущий год"
            accessibilityState={{ disabled: !canPrev }}
            style={({ pressed }) => [styles.arrow, !canPrev && styles.arrowOff, pressed && styles.pressed]}
            testID="stats-year-prev"
          >
            <View style={styles.arrowFlip}>
              <ChevronRightIcon size={18} color={canPrev ? DS.navy : DS.chevron} />
            </View>
          </Pressable>

          <View style={styles.yearWrap} pointerEvents="none">
            <Text style={styles.year} testID="stats-year">
              {year}
            </Text>
            {isCurrentYear && <Text style={styles.yearSub}>Текущий год</Text>}
          </View>

          <Pressable
            onPress={() => onYearChange(year + 1)}
            disabled={!canNext}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Следующий год"
            accessibilityState={{ disabled: !canNext }}
            style={({ pressed }) => [styles.arrow, !canNext && styles.arrowOff, pressed && styles.pressed]}
            testID="stats-year-next"
          >
            <ChevronRightIcon size={18} color={canNext ? DS.navy : DS.chevron} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  card: {
    backgroundColor: DS.cardBg,
    borderRadius: 22,
    padding: 8,
    gap: 8,
    shadowColor: DS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: DS.ringTrack,
    borderRadius: 14,
    padding: 3,
    gap: 3,
  },
  segBtn: { flex: 1, minHeight: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  segBtnOn: { backgroundColor: DS.cardBg, shadowColor: DS.shadow, shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontSize: 14, fontWeight: "600", color: DS.subInk },
  segTextOn: { color: DS.navy },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingBottom: 4 },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINISTRY.accentSoft,
  },
  arrowOff: { backgroundColor: DS.ringTrack },
  arrowFlip: { transform: [{ rotate: "180deg" }] },
  yearWrap: { alignItems: "center", flex: 1 },
  year: { fontSize: 24, fontWeight: "700", color: DS.navy, letterSpacing: -0.3, fontVariant: ["tabular-nums"] },
  yearSub: { fontSize: 12, fontWeight: "600", color: DS.subInk, marginTop: 1 },
  pressed: { opacity: 0.7 },
});
