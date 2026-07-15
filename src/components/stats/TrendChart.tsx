import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Circle, Line, G, Text as SvgText } from "react-native-svg";
import { COLORS, formatHM, monthCellsForSY, svcYear } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import { useMemo } from "react";

interface TrendChartProps {
  height?: number;
  onPressMonth?: (date: string, value: number) => void;
}

export function TrendChart({ height = 200, onPressMonth }: TrendChartProps) {
  const { records, sessions } = useStore();

  const chartData = useMemo(() => {
    const now = new Date();
    const syLabel = svcYear(now.getFullYear(), now.getMonth() + 1);
    const cells = monthCellsForSY(records, sessions, syLabel);

    // Convert to chart points
    return cells.map((cell, idx) => ({
      x: idx,
      y: cell.value,
      date: cell.date,
      label: cell.date.split("-")[1], // month number
    }));
  }, [records, sessions]);

  const maxY = useMemo(() => Math.max(...chartData.map((d) => d.y), 1), [chartData]);
  const minY = 0;

  const width = 340; // container width
  const paddingX = 20;
  const paddingY = 20;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const stepX = chartWidth / (chartData.length - 1);

  const scaleX = (i: number) => paddingX + i * stepX;
  const scaleY = (val: number) => paddingY + chartHeight - (val / maxY) * chartHeight;

  const pathData = chartData
    .map((d, i) => `${i === 0 ? "M" : "L"} ${scaleX(d.x)} ${scaleY(d.y)}`)
    .join(" ");

  // Area path
  const areaPathData =
    "M" +
    scaleX(chartData[0].x) +
    " " +
    (paddingY + chartHeight) +
    " " +
    pathData +
    " L" +
    scaleX(chartData[chartData.length - 1].x) +
    " " +
    (paddingY + chartHeight) +
    " Z";

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        <G stroke={COLORS.border} strokeWidth={0.5}>
          {[25, 50, 75, 100].map((pct) => (
            <Line
              key={pct}
              x1={paddingX}
              y1={paddingY + chartHeight * (1 - pct / 100)}
              x2={width - paddingX}
              y2={paddingY + chartHeight * (1 - pct / 100)}
            />
          ))}
        </G>

        {/* Area */}
        <Path d={areaPathData} fill={COLORS.accent} fillOpacity={0.12} />

        {/* Line */}
        <Path d={pathData} stroke={COLORS.accent} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {chartData.map((d) => (
          <Pressable
            key={d.date}
            onPress={() => onPressMonth?.(d.date, d.y)}
            style={({ pressed }) => [styles.touchArea, pressed && styles.touchAreaPressed]}
            hitSlop={16}
          >
            <Circle
              cx={scaleX(d.x)}
              cy={scaleY(d.y)}
              r={4}
              fill={COLORS.accent}
              stroke={COLORS.card}
              strokeWidth={2}
            />
          </Pressable>
        ))}

        {/* Y-axis labels */}
        {[0, 25, 50, 75, 100].map((pct) => (
          <SvgText
            key={pct}
            x={paddingX - 4}
            y={paddingY + chartHeight * (1 - pct / 100) + 4}
            textAnchor="end"
            fontSize={10}
            fill={COLORS.muted}
            fontWeight="500"
          >
            {Math.round((maxY * pct) / 100)}h
          </SvgText>
        ))}
      </Svg>

      {/* Month labels */}
      <View style={styles.labels}>
        {chartData.map((d) => (
          <Text key={d.date} style={styles.monthLabel}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  labels: {
    flexDirection: "row",
    width: 340,
    paddingHorizontal: 20,
    marginTop: -8,
    justifyContent: "space-between",
  },
  monthLabel: { fontSize: 10, fontWeight: "600", color: COLORS.muted },
  touchArea: { position: "absolute", width: 32, height: 32 },
  touchAreaPressed: { opacity: 0.5 },
});