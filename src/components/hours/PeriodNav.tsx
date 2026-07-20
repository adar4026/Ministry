import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRightIcon } from "@/components/icons";
import { MF } from "@/data/constants";
import { isCurrentMonth, isCurrentYear, type HistoryPeriod } from "@/data/stats";
import { serviceYearRange } from "@/data/serviceYear";
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
  // service year *ends* in. The range text below reads its start year from
  // serviceYearRange() (src/data/serviceYear.ts) rather than computing
  // `year - 1` itself — this component does no boundary arithmetic of its
  // own, per the domain rule living in exactly one place.
  let rangeLabel: string | null = null;
  if (period === "month") {
    title = `${MF[monthIndex0]} ${year}`;
    if (isCurrentMonth(year, monthIndex0 + 1, now)) subtitle = "Текущий месяц";
  } else if (period === "year") {
    title = String(year);
    if (isCurrentYear(year, now)) subtitle = "Текущий год";
    rangeLabel = `Сентябрь ${serviceYearRange(year).start.getFullYear()} — август ${year}`;
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
  // fontSize 11, not 12: at the 320px minimum supported width, the "Сентябрь
  // YYYY — август YYYY" string overflows its available ~180px by 1px at 12px
  // (measured: 181px), so react-native-web's numberOfLines={1} silently
  // ellipsis-truncates the closing year ("...август 20…"). 11px measures
  // 167px — clears the 320px minimum with a 13px margin (12px still overflows
  // by 1px at 320px; nothing smaller than 11 is needed). The string's length
  // is fixed regardless of which service year is shown (always two 4-digit
  // years), so this margin holds for every year, not just the current one.
  rangeLabel: { fontSize: 11, fontWeight: "500", color: C.mutedText, fontFamily: FONT, marginTop: 2 },
});
