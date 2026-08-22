// TASK_061 — отрисовка большого графика: маркеры только на реальных
// изменениях, выделенная последняя точка, идеальный темп как отдельная
// пунктирная прямая до цели, отсутствие выхода за правую границу.
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { PeriodChart } from "../PeriodChart";
import { CHART } from "../statsTokens";
import { monthChartSeries, yearChartSeries } from "@/data/periodChart";
import type { Session } from "@/types";

function session(date: string, durationMinutes: number): Session {
  return {
    id: `s-${date}-${durationMinutes}`,
    date,
    durationMinutes,
    source: "manual",
    note: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const WIDTH = 375 - 32 - 36; // экран iPhone минус отступы экрана и карточки
const AXIS_LABEL_WIDTH = 38; // полоса подписей оси Y справа (PeriodChart)

function renderChart(width: number, series = defaultSeries(), showMarkers = true): ReactTestRenderer {
  let renderer: ReactTestRenderer;
  act(() => {
    renderer = create(<PeriodChart series={series} height={220} showMarkers={showMarkers} accessibilityLabel="График" />);
  });
  act(() => {
    renderer!.root.findAll((n) => typeof n.props.onLayout === "function")[0].props.onLayout({ nativeEvent: { layout: { width } } });
  });
  return renderer!;
}

// Настоящий годовой ряд (12 трёхбуквенных подписей на 365 днях), а не
// синтетическая заглушка: проверять плотность подписей имеет смысл только
// на реальном распределении по оси.
function yearLikeSeries() {
  return yearChartSeries([], [session("2025-09-10", 10 * 60)], "2025–2026", 600, new Date(2026, 11, 1));
}

function defaultSeries() {
  // Июль 2026 целиком в прошлом относительно `now` ниже → линия до 31-го дня
  return monthChartSeries(
    [],
    [session("2026-07-03", 120), session("2026-07-08", 90)],
    2026,
    7,
    50,
    new Date(2026, 7, 5),
  );
}

describe("PeriodChart", () => {
  it("draws one solid fact path and one dashed ideal-pace line", () => {
    const r = renderChart(WIDTH);
    expect(r.root.findAllByType(Path)).toHaveLength(1);
    const dashed = r.root.findAllByType(Line).filter((n) => n.props.stroke === CHART.ideal);
    expect(dashed).toHaveLength(1);
    expect(dashed[0].props.strokeDasharray).toBeTruthy();
  });

  it("ideal-pace line runs from zero at the start to the goal on the last day", () => {
    const r = renderChart(WIDTH);
    const ideal = r.root.findAllByType(Line).find((n) => n.props.stroke === CHART.ideal)!;
    expect(ideal.props.y1).toBeGreaterThan(ideal.props.y2); // растёт слева направо
    expect(ideal.props.x2).toBeCloseTo(WIDTH - AXIS_LABEL_WIDTH, 5); // ровно правый край области графика
  });

  // TASK_063 — владелец забраковал предыдущую отрисовку как «блёклую».
  // Эти проверки фиксируют именно контраст, а не конкретные пиксели.
  it("draws the fact line in the saturated indigo, not a washed-out tint", () => {
    const r = renderChart(WIDTH);
    expect(r.root.findAllByType(Path)[0].props.stroke).toBe(CHART.fact);
    expect(r.root.findAllByType(Path)[0].props.strokeWidth).toBeGreaterThanOrEqual(3);
  });

  it("renders axis labels dark and bold, never in the light muted grey", () => {
    const r = renderChart(WIDTH);
    const labels = r.root.findAllByType(SvgText);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every((t) => t.props.fill === CHART.label)).toBe(true);
    expect(labels.every((t) => t.props.fontWeight === "700")).toBe(true);
  });

  it("никогда не рисует сетку прозрачной — контраст задаётся цветом, а не opacity", () => {
    const r = renderChart(WIDTH);
    expect(r.root.findAllByType(Line).every((n) => n.props.strokeOpacity === undefined)).toBe(true);
  });

  it("shrinks x-axis labels rather than letting month names overlap", () => {
    const monthly = renderChart(WIDTH);
    const monthFont = monthly.root.findAllByType(SvgText).slice(-1)[0].props.fontSize;
    // Год: 12 трёхбуквенных подписей в той же ширине — кегль обязан упасть
    const yearly = renderChart(WIDTH, yearLikeSeries());
    const yearFont = yearly.root.findAllByType(SvgText).slice(-1)[0].props.fontSize;
    expect(monthFont).toBeGreaterThan(yearFont);
  });

  it("marks every day the total actually changed, plus a filled last point", () => {
    const r = renderChart(WIDTH);
    const circles = r.root.findAllByType(Circle);
    const hollow = circles.filter((c) => c.props.stroke != null);
    const filled = circles.filter((c) => c.props.stroke == null);
    expect(hollow).toHaveLength(2); // 3 и 8 июля
    expect(filled).toHaveLength(1); // последняя фактическая точка
  });

  it("omits per-day markers when asked (year chart) but keeps the last point", () => {
    const r = renderChart(WIDTH, defaultSeries(), false);
    const circles = r.root.findAllByType(Circle);
    expect(circles.filter((c) => c.props.stroke != null)).toHaveLength(0);
    expect(circles).toHaveLength(1);
  });

  it("drops a tail label instead of letting «28» and «31» collide on a narrow screen", () => {
    // 320 px: «31» прижимается к правому краю и наезжало на «28» («2831»)
    const narrow = renderChart(320 - 32 - 36);
    const labels = narrow.root.findAllByType(SvgText).map((t) => String(t.props.children));
    expect(labels).toContain("28");
    expect(labels).not.toContain("31");
    // Регулярный ритм оси при этом сохраняется
    expect(labels).toEqual(expect.arrayContaining(["1", "4", "7", "10", "13"]));
  });

  it("keeps every month label on the year axis — the font shrinks instead", () => {
    const yearly = renderChart(320 - 32 - 36, yearLikeSeries());
    const labels = yearly.root.findAllByType(SvgText).map((t) => String(t.props.children));
    for (const m of ["сен", "дек", "мар", "авг"]) expect(labels).toContain(m);
  });

  it("never draws past the right edge, on a 375px screen or a narrower one", () => {
    for (const width of [WIDTH, 280]) {
      const r = renderChart(width);
      const xs = r.root.findAllByType(Line).flatMap((n) => [n.props.x1, n.props.x2]);
      expect(xs.every((x) => Number.isFinite(x) && x >= 0 && x <= width)).toBe(true);
    }
  });

  it("renders nothing but the legend before the container width is known", () => {
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(<PeriodChart series={defaultSeries()} accessibilityLabel="График" />);
    });
    expect(renderer!.root.findAllByType(Path)).toHaveLength(0);
    expect(renderer!.root.findAll((n) => n.props.accessibilityLabel === "График").length).toBeGreaterThan(0);
  });
});
