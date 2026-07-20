import { useState } from "react";
import type { GestureResponderEvent } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { COLORS, formatHM } from "@/data/constants";
import type { CumulativePoint } from "@/data/periodStats";

interface CumulativeChartProps {
  points: CumulativePoint[];
  height?: number;
  // Mini embed for the overview cards: no axis labels, no legend, no tap
  // interaction, thinner lines. The detail screens use the same points[]
  // and the same scaling math — only the chrome differs.
  compact?: boolean;
  // 1-based index of "today" within `points`, when the viewed period is the
  // current one — draws the vertical marker and is the initial selection.
  // null for a past/future period (no "today" inside it).
  todayIndex?: number | null;
  // Small dots at every point (year view — 12 control points is fine) vs.
  // only at the selected/today point (month view — one dot per day would be
  // visual noise, per TASK_037 §3.2/§4.2).
  showAllMarkers?: boolean;
}

// Накопительный график «Факт / План» (TASK_037) — общая модель точек и
// общий рендер и для компактного встроенного графика на карточках обзора, и
// для большого графика на детальных экранах месяца/года (см.
// src/data/periodStats.ts: monthCumulativePoints()/yearCumulativePoints()
// строят один и тот же CumulativePoint[], который здесь только
// отрисовывается — вторая независимая модель данных не заводится).
export function CumulativeChart({ points, height = 160, compact = false, todayIndex = null, showAllMarkers = false }: CumulativeChartProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(compact ? null : todayIndex);

  if (points.length === 0) return null;

  const paddingX = compact ? 4 : 24;
  const paddingTop = compact ? 4 : 16;
  const paddingBottom = compact ? 4 : 28;
  const chartWidth = Math.max(0, containerWidth - paddingX * 2);
  const chartHeight = height - paddingTop - paddingBottom;

  const maxY = Math.max(1, ...points.map((p) => Math.max(p.actualHours, p.idealHours)));
  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : 0;

  const scaleX = (i: number) => paddingX + i * stepX;
  const scaleY = (val: number) => paddingTop + chartHeight - (val / maxY) * chartHeight;

  const actualPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(i)} ${scaleY(p.actualHours)}`).join(" ");
  const idealPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(i)} ${scaleY(p.idealHours)}`).join(" ");

  const selected = selectedIndex != null ? points.find((p) => p.index === selectedIndex) ?? null : null;

  function handlePress(e: GestureResponderEvent) {
    if (compact || chartWidth <= 0) return;
    // react-native-web's synthetic event only fills in locationX for touch
    // input — a mouse click leaves it undefined and reports offsetX (the
    // native DOM MouseEvent field) on nativeEvent instead. Native RN touch
    // always has locationX, so this falls through to it unchanged there.
    const ne = e.nativeEvent as unknown as { locationX?: number; offsetX?: number };
    const x = typeof ne.locationX === "number" ? ne.locationX : ne.offsetX;
    if (typeof x !== "number" || !Number.isFinite(x)) return;
    const raw = Math.round((x - paddingX) / (stepX || 1));
    if (!Number.isFinite(raw)) return;
    const clamped = Math.max(0, Math.min(points.length - 1, raw));
    setSelectedIndex(points[clamped].index);
  }

  // Sparse x-axis labels — at most ~6 regardless of period length or screen
  // width, never one per day (TASK_037 §3.2 "редкие подписи дат").
  const labelStep = Math.max(1, Math.ceil(points.length / 6));

  return (
    <View style={compact ? styles.compactWrap : styles.wrap}>
      <View onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)} style={styles.full}>
        {containerWidth > 0 && (
          <Pressable onPress={handlePress} disabled={compact} pointerEvents="box-only">
            <Svg width={containerWidth} height={height}>
              {/* Goal reference line */}
              <Line
                x1={paddingX}
                y1={scaleY(points[points.length - 1].idealHours)}
                x2={containerWidth - paddingX}
                y2={scaleY(points[points.length - 1].idealHours)}
                stroke={COLORS.border}
                strokeWidth={1}
                strokeDasharray={compact ? undefined : "2 3"}
              />

              {todayIndex != null && (
                <Line
                  x1={scaleX(todayIndex - 1)}
                  y1={paddingTop}
                  x2={scaleX(todayIndex - 1)}
                  y2={paddingTop + chartHeight}
                  stroke={COLORS.border}
                  strokeWidth={1}
                />
              )}

              {/* Ideal plan — light dashed line */}
              <Path
                d={idealPath}
                stroke={COLORS.muted}
                strokeWidth={compact ? 1.5 : 2}
                strokeDasharray="4 4"
                fill="none"
                strokeLinecap="round"
              />

              {/* Actual — solid accent line */}
              <Path
                d={actualPath}
                stroke={COLORS.accent}
                strokeWidth={compact ? 2 : 2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {showAllMarkers &&
                points.map((p, i) => (
                  <Circle key={p.index} cx={scaleX(i)} cy={scaleY(p.actualHours)} r={2.5} fill={COLORS.accent} />
                ))}

              {selected && (
                <Circle
                  cx={scaleX(points.findIndex((p) => p.index === selected.index))}
                  cy={scaleY(selected.actualHours)}
                  r={5}
                  fill={COLORS.card}
                  stroke={COLORS.accent}
                  strokeWidth={2.5}
                />
              )}
            </Svg>
          </Pressable>
        )}
      </View>

      {!compact && (
        <View style={[styles.labels, { paddingHorizontal: paddingX }]}>
          {points.map((p, i) =>
            i % labelStep === 0 || i === points.length - 1 ? (
              <Text key={p.index} style={styles.labelText}>
                {p.label}
              </Text>
            ) : null,
          )}
        </View>
      )}

      {!compact && selected && (
        <Text style={styles.callout}>
          {selected.label}: {formatHM(selected.actualHours)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  compactWrap: { width: "100%" },
  full: { width: "100%" },
  labels: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  labelText: { fontSize: 10, fontWeight: "600", color: COLORS.muted },
  callout: { fontSize: 12, fontWeight: "700", color: COLORS.text, marginTop: 6, textAlign: "center" },
});
