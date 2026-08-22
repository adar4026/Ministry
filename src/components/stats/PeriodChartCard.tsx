import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/data/constants";
import type { PeriodChartSeries } from "@/data/periodChart";
import { PeriodChart } from "./PeriodChart";

interface PeriodChartCardProps {
  title: string; // «Динамика часов» / «Динамика служебного года»
  series: PeriodChartSeries;
  showMarkers?: boolean;
  accessibilityLabel: string;
  height?: number;
}

// Белая карточка с большим графиком (TASK_061 §2/§3). Здесь же живут честные
// оговорки о данных: линия факта либо строится по реальным датам сессий,
// либо не строится вовсе — «размазать» месячный итог по дням запрещено
// (см. шапку src/data/periodChart.ts).
export function PeriodChartCard({ title, series, showMarkers = true, accessibilityLabel, height = 220 }: PeriodChartCardProps) {
  const isEmpty = series.actual.length === 0 || series.actual[series.actual.length - 1].hours === 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      {series.legacyOnly ? (
        <Text style={styles.notice}>
          За этот месяц сохранён только итог за месяц, без разбивки по дням, — фактическая линия не строится.
        </Text>
      ) : (
        <PeriodChart series={series} height={height} showMarkers={showMarkers} accessibilityLabel={accessibilityLabel} />
      )}

      {!series.legacyOnly && isEmpty && <Text style={styles.notice}>Пока нет записей за этот период.</Text>}

      {series.approximateMonths.length > 0 && (
        <Text style={styles.notice}>
          Без дневной детализации: {series.approximateMonths.join(", ")} — по этим месяцам сохранён только месячный итог, он
          добавлен одним шагом в последний день месяца.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: { fontSize: 17, fontWeight: "700", color: COLORS.text, marginBottom: 14 },
  notice: { fontSize: 12, fontWeight: "600", color: COLORS.muted, lineHeight: 17, marginTop: 12 },
});
