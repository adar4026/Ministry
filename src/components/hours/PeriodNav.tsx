import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRightIcon } from "@/components/icons";
import { MF } from "@/data/constants";
import { isCurrentMonth, isCurrentYear, type HistoryPeriod } from "@/data/stats";
import { HISTORY_COLORS as C, HISTORY_FONT_FAMILY as FONT } from "./historyTokens";

// Period navigation row (TASK_033): ‹ label/subtitle › inside a card, above
// the calendar. `year`/`monthIndex0` describe the calendar month the
// HistoryCalendar/list below are currently showing — Month-period arrows
// move both (Dec/Jan wraparound handled by the caller via addMonths()),
// Year-period arrows move only `year`, and All-time hides live navigation
// entirely (disabled, no active-looking state) per the owner's spec.
export function PeriodNav({
  period,
  year,
  monthIndex0,
  now,
  onPrev,
  onNext,
}: {
  period: HistoryPeriod;
  year: number;
  monthIndex0: number;
  now: Date;
  onPrev: () => void;
  onNext: () => void;
}) {
  const disabled = period === "all";

  let title: string;
  let subtitle: string | null = null;
  // Service year (TASK_038): `year` is the calendar year the displayed
  // service year *ends* in, so its range is always Sep(year-1)..Aug(year).
  let rangeLabel: string | null = null;
  if (period === "month") {
    title = `${MF[monthIndex0]} ${year}`;
    if (isCurrentMonth(year, monthIndex0 + 1, now)) subtitle = "Текущий месяц";
  } else if (period === "year") {
    title = String(year);
    if (isCurrentYear(year, now)) subtitle = "Текущий год";
    rangeLabel = `Сентябрь ${year - 1} — август ${year}`;
  } else {
    title = "Весь период";
  }

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onPrev}
        disabled={disabled}
        hitSlop={10}
        style={[styles.arrowBtn, disabled && styles.arrowBtnDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Предыдущий период"
        accessibilityState={{ disabled }}
      >
        <View style={styles.arrowLeft}>
          <ChevronRightIcon size={16} color={disabled ? C.mutedText : C.primaryText} />
        </View>
      </Pressable>

      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle ?? " "}
        </Text>
        {rangeLabel != null && (
          <Text style={styles.rangeLabel} numberOfLines={1}>
            {rangeLabel}
          </Text>
        )}
      </View>

      <Pressable
        onPress={onNext}
        disabled={disabled}
        hitSlop={10}
        style={[styles.arrowBtn, disabled && styles.arrowBtnDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Следующий период"
        accessibilityState={{ disabled }}
      >
        <ChevronRightIcon size={16} color={disabled ? C.mutedText : C.primaryText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.cardBackground,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 12,
    gap: 8,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.iconBg,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowBtnDisabled: { opacity: 0.5 },
  arrowLeft: { transform: [{ rotate: "180deg" }] },
  center: { flex: 1, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: C.primaryText, fontFamily: FONT },
  subtitle: { fontSize: 13, fontWeight: "600", color: C.todayAccent, fontFamily: FONT, marginTop: 2 },
  rangeLabel: { fontSize: 12, fontWeight: "500", color: C.mutedText, fontFamily: FONT, marginTop: 2 },
});
