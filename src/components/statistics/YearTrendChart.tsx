// TASK_081 — «Динамика»: the twelve months of one service year (September
// … August, in the order `months` arrives — TASK_082) as a smooth line with
// a dot per month and a soft accent wash under it. react-native-svg (already a
// dependency — PeriodChart uses it), no chart library. One colour family:
// MINISTRY.accent for the line/dots, its low-opacity fills for the area and
// the selected halo; grid and captions in DS's muted inks. Tapping a month
// column selects it and the caption above the plot reads «Март · 52 ч 30 м».
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import { DS, MINISTRY } from "@/components/dashboard/tokens";
import { MF, MN } from "@/data/constants";
import { formatStatMinutes, type MonthStat } from "@/data/serviceStats";
import { serviceYearLabel } from "@/data/serviceYear";
import { useThemedStyles } from "@/theme";

const PAD_TOP = 14;
const PAD_BOTTOM = 24;
const PAD_X = 12;
const DOT = 3.5;
const DOT_SELECTED = 5.5;

// Catmull-Rom → cubic Bézier, the standard "smooth through every point"
// curve. Control points are clamped to [top, baseline]: a Bézier never
// leaves the hull of its control points, so the line can dip to zero between
// a busy month and an empty one but never below the axis (a plain
// Catmull-Rom does overshoot there) and never above the plot.
function smoothPath(points: { x: number; y: number }[], top: number, baseline: number): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x} ${points[0].y}`;
  const clampY = (y: number) => Math.min(baseline, Math.max(top, y));
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = clampY(p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = clampY(p2.y - (p3.y - p1.y) / 6);
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

// SVG text does not inherit the app's system font stack on web.
const LABEL_FONT = "-apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto, sans-serif";

export function YearTrendChart({
  months,
  year,
  height = 190,
  // Months after this index (0-based, into `months`) have not happened yet
  // in the current service year: they get no dot, the line stops at the
  // last real one.
  lastMonthIndex = 11,
}: {
  months: MonthStat[];
  // Service end year — only used to key the gradient id and the a11y label.
  year: number;
  height?: number;
  lastMonthIndex?: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const [width, setWidth] = useState(0);
  const gradientId = `trend-${year}`;

  const lastWithData = useMemo(() => {
    for (let i = Math.min(11, lastMonthIndex); i >= 0; i--) if (months[i].minutes > 0) return i;
    return -1;
  }, [months, lastMonthIndex]);
  const [selected, setSelected] = useState<number | null>(null);
  const shown = selected ?? (lastWithData >= 0 ? lastWithData : null);

  const maxMinutes = Math.max(60, ...months.map((m) => m.minutes));
  const plotWidth = Math.max(0, width - PAD_X * 2);
  const plotHeight = Math.max(0, height - PAD_TOP - PAD_BOTTOM);
  const slot = plotWidth / 12;
  const x = (i: number) => PAD_X + slot * i + slot / 2;
  const y = (minutes: number) => PAD_TOP + plotHeight - (minutes / maxMinutes) * plotHeight;
  const baseline = PAD_TOP + plotHeight;

  const drawn = months.slice(0, Math.min(12, lastMonthIndex + 1)).map((m, i) => ({ x: x(i), y: y(m.minutes), minutes: m.minutes }));
  const linePath = smoothPath(drawn, PAD_TOP, baseline);
  const areaPath =
    drawn.length > 0 ? `${linePath} L${drawn[drawn.length - 1].x} ${baseline} L${drawn[0].x} ${baseline} Z` : "";

  const gridLines = [0.5, 1].map((f) => PAD_TOP + plotHeight - f * plotHeight);
  const captionText = shown !== null ? `${MF[months[shown].month - 1]} · ${formatStatMinutes(months[shown].minutes)}` : "Нет данных";

  return (
    <View testID="stats-trend">
      <Text style={styles.caption} testID="stats-trend-caption">
        {captionText}
      </Text>
      <View style={styles.plot} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={height} accessibilityLabel={`Динамика по месяцам, служебный год ${serviceYearLabel(year)}`}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={MINISTRY.accent} stopOpacity={0.22} />
                <Stop offset="1" stopColor={MINISTRY.accent} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>

            {gridLines.map((gy, i) => (
              <Line key={i} x1={PAD_X} x2={width - PAD_X} y1={gy} y2={gy} stroke={DS.divider} strokeWidth={1} strokeDasharray="3 4" />
            ))}
            <Line x1={PAD_X} x2={width - PAD_X} y1={baseline} y2={baseline} stroke={DS.divider} strokeWidth={1} />

            {areaPath ? <Path d={areaPath} fill={`url(#${gradientId})`} /> : null}
            {linePath ? <Path d={linePath} fill="none" stroke={MINISTRY.accent} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" /> : null}

            {drawn.map((p, i) => {
              const on = shown === i;
              return (
                <Circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={on ? DOT_SELECTED : DOT}
                  fill={p.minutes > 0 ? MINISTRY.accent : DS.cardBg}
                  stroke={on ? DS.cardBg : MINISTRY.accent}
                  strokeWidth={on ? 2.5 : 1.5}
                  opacity={p.minutes > 0 || on ? 1 : 0.6}
                />
              );
            })}
            {shown !== null && shown < drawn.length && (
              <Circle cx={drawn[shown].x} cy={drawn[shown].y} r={11} fill={MINISTRY.accent} fillOpacity={0.14} />
            )}

            {months.map((m, i) => (
              <SvgText
                key={i}
                x={x(i)}
                y={height - 6}
                fontFamily={LABEL_FONT}
                fontSize={slot < 22 ? 8 : slot < 26 ? 9 : 10}
                fontWeight={shown === i ? "700" : "500"}
                fill={shown === i ? DS.navy : DS.subInk}
                textAnchor="middle"
              >
                {MN[m.month - 1]}
              </SvgText>
            ))}

          </Svg>
        )}
        {/* Tap targets: one full-height column per drawn month, as plain
            Pressables over the SVG (an SVG element's own onPress leaks RN
            responder props into the DOM on web). */}
        {width > 0 && (
          <View style={[StyleSheet.absoluteFill, styles.hits, { paddingHorizontal: PAD_X }]} pointerEvents="box-none">
            {drawn.map((_, i) => (
              <Pressable
                key={`hit-${i}`}
                onPress={() => setSelected(i)}
                accessibilityRole="button"
                accessibilityLabel={`${MF[months[i].month - 1]}: ${formatStatMinutes(months[i].minutes)}`}
                style={{ width: slot, height }}
                testID={`stats-trend-hit-${i + 1}`}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  caption: { fontSize: 14, fontWeight: "600", color: DS.navy, marginBottom: 4, minHeight: 18 },
  plot: { width: "100%" },
  hits: { flexDirection: "row" },
});
