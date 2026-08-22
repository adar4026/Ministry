// TASK_061 — отрисовка большого графика: маркеры только на реальных
// изменениях, выделенная последняя точка, идеальный темп как отдельная
// пунктирная прямая до цели, отсутствие выхода за правую границу.
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { Circle, Line, Path } from "react-native-svg";
import { PeriodChart } from "../PeriodChart";
import { monthChartSeries } from "@/data/periodChart";
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
    const dashed = r.root.findAllByType(Line).filter((n) => n.props.strokeDasharray === "5 5");
    expect(dashed).toHaveLength(1);
  });

  it("ideal-pace line runs from zero at the start to the goal on the last day", () => {
    const r = renderChart(WIDTH);
    const ideal = r.root.findAllByType(Line).find((n) => n.props.strokeDasharray === "5 5")!;
    expect(ideal.props.y1).toBeGreaterThan(ideal.props.y2); // растёт слева направо
    expect(ideal.props.x2).toBeCloseTo(WIDTH - 34, 5); // ровно правый край области графика (полоса подписей оси Y — справа)
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
