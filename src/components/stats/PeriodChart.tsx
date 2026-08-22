import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { axisTickLabel, idealHoursAt, type PeriodChartSeries } from "@/data/periodChart";
import { AXIS_FONT_SIZES, CHART } from "./statsTokens";

interface PeriodChartProps {
  series: PeriodChartSeries;
  height?: number;
  // Белые кружки с индиго-обводкой на днях реального изменения. Для года
  // выключены: точек сотни, и линия должна оставаться чистой (TASK_061 §3).
  showMarkers?: boolean;
  accessibilityLabel: string;
}

// Ширина полосы под подписи оси Y (подписи справа, TASK_061 §2).
const AXIS_LABEL_WIDTH = 38;
const PAD_LEFT = 2;
const PAD_TOP = 14;
const PAD_BOTTOM = 26;

// Ширина символа относительно кегля — грубая, но достаточная оценка для
// цифр и трёхбуквенных названий месяцев в текущем шрифте; используется
// только чтобы выбрать кегль, при котором подписи гарантированно не
// наезжают друг на друга.
const CHAR_WIDTH_RATIO = 0.6;
// Запас при ВЫБОРЕ кегля — с ним подписи стоят свободно, а не впритык.
const FONT_FIT_GAP = 4;
// Минимальный просвет при отбраковке уже отрисовываемых подписей: здесь
// кегль менять поздно, и требовать те же 4 px значило бы выбрасывать
// подписи, которые на самом деле помещаются.
const LABEL_MIN_GAP = 2;

// Самый крупный кегль из ряда, при котором `count` подписей длиной
// `maxLength` ещё помещаются в `available` без наложения.
function pickAxisFontSize(available: number, count: number, maxLength: number): number {
  if (count <= 0 || available <= 0) return AXIS_FONT_SIZES[AXIS_FONT_SIZES.length - 1];
  const perLabel = available / count;
  return (
    AXIS_FONT_SIZES.find((size) => maxLength * size * CHAR_WIDTH_RATIO + FONT_FIT_GAP <= perLabel) ??
    AXIS_FONT_SIZES[AXIS_FONT_SIZES.length - 1]
  );
}

// Большой накопительный график «Факт / Идеальный темп» (TASK_061,
// контрастная отрисовка — TASK_063). Один компонент и для месяца, и для
// служебного года: различаются только переданный ряд
// (src/data/periodChart.ts) и плотность маркеров/сетки, заданная самим
// рядом. Рендер — react-native-svg, уже входящий в зависимости проекта.
export function PeriodChart({ series, height = 220, showMarkers = true, accessibilityLabel }: PeriodChartProps) {
  const [width, setWidth] = useState(0);

  const plotWidth = Math.max(0, width - PAD_LEFT - AXIS_LABEL_WIDTH);
  const plotHeight = Math.max(0, height - PAD_TOP - PAD_BOTTOM);
  const maxY = series.maxY > 0 ? series.maxY : 1;
  const totalUnits = series.totalUnits > 0 ? series.totalUnits : 1;

  const x = (index: number) => PAD_LEFT + (index / totalUnits) * plotWidth;
  const y = (hours: number) => PAD_TOP + plotHeight - (Math.max(0, hours) / maxY) * plotHeight;

  const xFontSize = pickAxisFontSize(
    plotWidth,
    series.xLabels.length,
    Math.max(1, ...series.xLabels.map((l) => l.label.length)),
  );
  const yLabels = series.yTicks.map(axisTickLabel);
  const yFontSize = Math.max(1, ...yLabels.map((l) => l.length)) >= 4 ? 12 : 13;

  // Подпись оси X центрируется по своей позиции, но не может выходить за
  // края области графика: у года первая метка («сен») стоит почти на нуле
  // и без этого обрезалась бы левым краем карточки.
  const labelHalfWidth = (label: string) => (label.length * xFontSize * CHAR_WIDTH_RATIO) / 2;
  const labelX = (index: number, label: string) => {
    const half = labelHalfWidth(label) + 1;
    return Math.min(Math.max(x(index), PAD_LEFT + half), PAD_LEFT + plotWidth - half);
  };

  // Прижатие к краям выше может столкнуть соседние подписи (на 320 px
  // «28» и «31» в 31-дневном месяце сливались в «2831»). Кегль здесь уже
  // выбран, поэтому лишнюю подпись просто не рисуем. Сравнение идёт с
  // последней ОСТАВЛЕННОЙ подписью, а не с предыдущей по списку: иначе на
  // плотной оси выбрасывалась бы вся цепочка вместо прореживания через
  // одну (12 месяцев служебного года на 320 px схлопывались в «сен»).
  const visibleXLabels: typeof series.xLabels = [];
  let lastLabelRight = -Infinity;
  for (const l of series.xLabels) {
    const half = labelHalfWidth(l.label);
    const cx = labelX(l.index, l.label);
    if (cx - half < lastLabelRight + LABEL_MIN_GAP) continue;
    visibleXLabels.push(l);
    lastLabelRight = cx + half;
  }

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
            {/* Ежедневная вертикальная пунктирная сетка. Проходит на всю
                высоту, за подписями оси X — как в референсе владельца. */}
            {series.gridIndices.map((index) => (
              <Line
                key={`x-${index}`}
                x1={x(index)}
                y1={PAD_TOP}
                x2={x(index)}
                y2={height}
                stroke={CHART.grid}
                strokeWidth={1}
                strokeDasharray="3 4"
              />
            ))}

            {/* Горизонтальная сетка + подписи оси Y справа. Крайние
                деления (0 и верх шкалы) читаются как оси. */}
            {series.yTicks.map((tick, i) => {
              const isAxis = i === 0 || i === series.yTicks.length - 1;
              return (
                <G key={`y-${tick}`}>
                  <Line
                    x1={PAD_LEFT}
                    y1={y(tick)}
                    x2={PAD_LEFT + plotWidth}
                    y2={y(tick)}
                    stroke={isAxis ? CHART.axis : CHART.grid}
                    strokeWidth={isAxis ? 1.5 : 1}
                  />
                  <SvgText
                    x={PAD_LEFT + plotWidth + 8}
                    y={y(tick) + yFontSize / 2 - 1}
                    fontSize={yFontSize}
                    fontWeight="700"
                    fill={CHART.label}
                    textAnchor="start"
                  >
                    {yLabels[i]}
                  </SvgText>
                </G>
              );
            })}

            {/* Идеальный темп — прямая от 0 в начале периода до цели в его
                последний день. Это не прогноз: линия не зависит от факта и
                всегда заканчивается ровно на исходной цели. */}
            {series.goalHours > 0 && (
              <Line
                x1={x(0)}
                y1={y(idealHoursAt(series, 0))}
                x2={x(totalUnits)}
                y2={y(idealHoursAt(series, totalUnits))}
                stroke={CHART.ideal}
                strokeWidth={2.5}
                strokeDasharray="6 6"
                strokeLinecap="round"
              />
            )}

            {/* Факт */}
            {actualPath && (
              <Path d={actualPath} stroke={CHART.fact} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {markers.map((p) => (
              <Circle
                key={`m-${p.index}`}
                cx={x(p.index)}
                cy={y(p.hours)}
                r={4}
                fill={CHART.markerFill}
                stroke={CHART.fact}
                strokeWidth={2.2}
              />
            ))}

            {/* Последняя фактическая точка — заполненный маркер */}
            {last && <Circle cx={x(last.index)} cy={y(last.hours)} r={5} fill={CHART.fact} />}

            {/* Подписи оси X */}
            {visibleXLabels.map((l) => (
              <SvgText
                key={`xl-${l.index}-${l.label}`}
                x={labelX(l.index, l.label)}
                y={height - 7}
                fontSize={xFontSize}
                fontWeight="700"
                fill={CHART.label}
                textAnchor="middle"
              >
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
  legendLine: { width: 18, height: 3, borderRadius: 2, backgroundColor: CHART.fact },
  legendDashed: { width: 18, height: 0, borderTopWidth: 3, borderStyle: "dashed", borderColor: CHART.ideal },
  legendLabel: { fontSize: 13, fontWeight: "700", color: CHART.label },
});
