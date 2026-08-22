import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { COLORS } from "@/data/constants";
import { axisTickLabel, idealHoursAt, type PeriodChartSeries } from "@/data/periodChart";

interface PeriodChartProps {
  series: PeriodChartSeries;
  height?: number;
  // Белые кружки с синей обводкой на днях реального изменения. Для года
  // выключены: точек сотни, и линия должна оставаться чистой (TASK_061 §3).
  showMarkers?: boolean;
  accessibilityLabel: string;
}

// Ширина полосы под подписи оси Y (подписи справа, TASK_061 §2).
const AXIS_LABEL_WIDTH = 34;
const PAD_LEFT = 2;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;

// Большой накопительный график «Факт / Идеальный темп» (TASK_061). Один
// компонент и для месяца, и для служебного года — различаются только
// переданный ряд (src/data/periodChart.ts) и плотность маркеров/сетки,
// заданная самим рядом. Рендер — react-native-svg, уже входящий в
// зависимости проекта; новая библиотека графиков не добавляется.
export function PeriodChart({ series, height = 220, showMarkers = true, accessibilityLabel }: PeriodChartProps) {
  const [width, setWidth] = useState(0);

  const plotWidth = Math.max(0, width - PAD_LEFT - AXIS_LABEL_WIDTH);
  const plotHeight = Math.max(0, height - PAD_TOP - PAD_BOTTOM);
  const maxY = series.maxY > 0 ? series.maxY : 1;
  const totalUnits = series.totalUnits > 0 ? series.totalUnits : 1;

  const x = (index: number) => PAD_LEFT + (index / totalUnits) * plotWidth;
  // Подпись оси X центрируется по своей позиции, но не может выходить за
  // края области графика: у года первая метка («сен») стоит почти на нуле
  // и без этого обрезалась бы левым краем карточки.
  const labelX = (index: number, label: string) => {
    const half = label.length * 3 + 1; // ~шрифт 10, моноширинная оценка
    return Math.min(Math.max(x(index), PAD_LEFT + half), PAD_LEFT + plotWidth - half);
  };
  const y = (hours: number) => PAD_TOP + plotHeight - (Math.max(0, hours) / maxY) * plotHeight;

  // Линия факта всегда стартует из нуля в начале периода (index 0) — это
  // факт, а не экстраполяция: на старте периода накоплено 0 часов.
  const actualPath =
    series.actual.length > 0
      ? [`M ${x(0)} ${y(0)}`, ...series.actual.map((p) => `L ${x(p.index)} ${y(p.hours)}`)].join(" ")
      : null;

  const last = series.actual.length > 0 ? series.actual[series.actual.length - 1] : null;
  const markers = showMarkers ? series.actual.filter((p) => p.isChange && p.index !== last?.index) : [];

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.canvas}>
        {width > 0 && (
          <Svg width={width} height={height}>
            {/* Тонкая горизонтальная сетка + подписи оси Y справа */}
            {series.yTicks.map((tick) => (
              <G key={`y-${tick}`}>
                <Line x1={PAD_LEFT} y1={y(tick)} x2={PAD_LEFT + plotWidth} y2={y(tick)} stroke={COLORS.border} strokeWidth={1} />
                <SvgText
                  x={PAD_LEFT + plotWidth + 8}
                  y={y(tick) + 3.5}
                  fontSize={10}
                  fontWeight="600"
                  fill={COLORS.muted}
                  textAnchor="start"
                >
                  {axisTickLabel(tick)}
                </SvgText>
              </G>
            ))}

            {/* Очень лёгкая вертикальная пунктирная сетка */}
            {series.gridIndices.map((index) => (
              <Line
                key={`x-${index}`}
                x1={x(index)}
                y1={PAD_TOP}
                x2={x(index)}
                y2={PAD_TOP + plotHeight}
                stroke={COLORS.border}
                strokeWidth={1}
                strokeOpacity={0.5}
                strokeDasharray="2 4"
              />
            ))}

            {/* Идеальный темп — прямая от 0 в начале периода до цели в его
                последний день. Это не прогноз: линия не зависит от факта и
                всегда заканчивается ровно на исходной цели. */}
            {series.goalHours > 0 && (
              <Line
                x1={x(0)}
                y1={y(idealHoursAt(series, 0))}
                x2={x(totalUnits)}
                y2={y(idealHoursAt(series, totalUnits))}
                stroke={COLORS.muted}
                strokeWidth={2}
                strokeDasharray="5 5"
                strokeLinecap="round"
                strokeOpacity={0.55}
              />
            )}

            {/* Факт */}
            {actualPath && (
              <Path d={actualPath} stroke={COLORS.accent} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {markers.map((p) => (
              <Circle key={`m-${p.index}`} cx={x(p.index)} cy={y(p.hours)} r={3.5} fill={COLORS.card} stroke={COLORS.accent} strokeWidth={2} />
            ))}

            {/* Последняя фактическая точка — заполненный маркер */}
            {last && <Circle cx={x(last.index)} cy={y(last.hours)} r={4.5} fill={COLORS.accent} />}

            {/* Подписи оси X */}
            {series.xLabels.map((l) => (
              <SvgText key={`xl-${l.index}-${l.label}`} x={labelX(l.index, l.label)} y={height - 6} fontSize={10} fontWeight="600" fill={COLORS.muted} textAnchor="middle">
                {l.label}
              </SvgText>
            ))}
          </Svg>
        )}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.legendLine} />
          <Text style={styles.legendLabel}>Факт</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendDashed} />
          <Text style={styles.legendLabel}>Идеальный темп</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { width: "100%" },
  legend: { flexDirection: "row", gap: 18, justifyContent: "center", marginTop: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  legendLine: { width: 16, height: 3, borderRadius: 2, backgroundColor: COLORS.accent },
  legendDashed: { width: 16, height: 0, borderTopWidth: 2, borderStyle: "dashed", borderColor: COLORS.muted, opacity: 0.7 },
  legendLabel: { fontSize: 12, fontWeight: "600", color: COLORS.muted },
});
