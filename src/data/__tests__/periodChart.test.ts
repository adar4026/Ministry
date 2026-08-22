// TASK_061 — дневная модель больших графиков: месяц и служебный год.
// Чистые функции, без React и StoreContext.
import { axisTickLabel, idealHoursAt, monthChartSeries, niceScale, yearChartSeries } from "../periodChart";
import { yearPeriodSummary } from "../periodStats";
import type { HourRecord, Session } from "@/types";

function session(date: string, durationMinutes: number): Session {
  return {
    id: `s-${date}-${durationMinutes}-${Math.random()}`,
    date,
    durationMinutes,
    source: "manual",
    note: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function record(year: number, month: number, hours: number): HourRecord {
  return { id: `r-${year}-${month}`, year, month, hours, note: "" };
}

const noNonsense = (values: number[]) => values.every((v) => Number.isFinite(v) && v >= 0);

describe("niceScale / axisTickLabel", () => {
  it("gives 0..50 by 10 for the monthly goal", () => {
    expect(niceScale(50)).toEqual({ max: 50, ticks: [0, 10, 20, 30, 40, 50] });
  });

  it("gives 0..600 by 100 for the yearly goal", () => {
    expect(niceScale(600)).toEqual({ max: 600, ticks: [0, 100, 200, 300, 400, 500, 600] });
  });

  it("never returns NaN/Infinity or an empty axis for degenerate input", () => {
    for (const bad of [0, -10, NaN, Infinity]) {
      const s = niceScale(bad);
      expect(s.ticks.length).toBeGreaterThanOrEqual(2);
      expect(noNonsense(s.ticks)).toBe(true);
      expect(Number.isFinite(s.max)).toBe(true);
    }
  });

  it("renders tick labels without empty strings or long float tails", () => {
    expect(axisTickLabel(0)).toBe("0");
    expect(axisTickLabel(2.5)).toBe("2.5");
    expect(axisTickLabel(NaN)).toBe("0");
    expect(axisTickLabel(600)).toBe("600");
  });
});

describe("monthChartSeries — длина месяца", () => {
  const cases: [string, number, number, number][] = [
    ["28-day February", 2026, 2, 28],
    ["29-day leap February", 2028, 2, 29],
    ["30-day month", 2026, 4, 30],
    ["31-day month", 2026, 7, 31],
  ];

  it.each(cases)("%s covers every calendar day on the X axis", (_label, year, month, days) => {
    const now = new Date(year, month, 15); // месяц уже в прошлом → линия до конца
    const s = monthChartSeries([], [], year, month, 50, now);
    expect(s.totalUnits).toBe(days);
    expect(s.gridIndices).toHaveLength(days);
    expect(s.actual).toHaveLength(days);
    expect(s.xLabels[0]).toEqual({ index: 1, label: "1" });
    expect(s.xLabels.every((l) => l.index >= 1 && l.index <= days && l.label !== "")).toBe(true);
  });
});

describe("monthChartSeries — факт", () => {
  it("накопительная линия строится по реальным датам сессий и заканчивается сегодня", () => {
    const now = new Date(2026, 6, 10, 12); // 10 июля 2026
    const sessions = [session("2026-07-03", 120), session("2026-07-03", 60), session("2026-07-08", 90)];
    const s = monthChartSeries([], sessions, 2026, 7, 50, now);

    expect(s.lastActualIndex).toBe(10);
    expect(s.actual).toHaveLength(10);
    expect(s.actual[2].hours).toBeCloseTo(3, 5); // 3 июля: 180 мин
    expect(s.actual[7].hours).toBeCloseTo(4.5, 5); // 8 июля: +90 мин
    expect(s.actual[9].hours).toBeCloseTo(4.5, 5); // 10 июля: без записей — плоско
    // Ни одной точки в будущем: 11..31 июля не существует в ряду
    expect(s.actual.some((p) => p.index > 10)).toBe(false);
    expect(noNonsense(s.actual.map((p) => p.hours))).toBe(true);
  });

  it("маркеры стоят только на днях реального изменения", () => {
    const now = new Date(2026, 6, 10, 12);
    const s = monthChartSeries([], [session("2026-07-03", 120), session("2026-07-08", 90)], 2026, 7, 50, now);
    expect(s.actual.filter((p) => p.isChange).map((p) => p.index)).toEqual([3, 8]);
  });

  it("для прошедшего месяца линия доходит до последнего дня месяца", () => {
    const now = new Date(2026, 7, 5); // август 2026
    const s = monthChartSeries([], [session("2026-07-03", 120)], 2026, 7, 50, now);
    expect(s.lastActualIndex).toBe(31);
    expect(s.actual[30].hours).toBeCloseTo(2, 5);
  });

  it("для будущего месяца фактической линии нет вовсе", () => {
    const now = new Date(2026, 5, 15); // июнь 2026
    const s = monthChartSeries([], [], 2026, 7, 50, now);
    expect(s.actual).toEqual([]);
    expect(s.lastActualIndex).toBeNull();
  });

  it("пустой период: линия есть, но ровно нулевая — без NaN и отрицательных значений", () => {
    const now = new Date(2026, 6, 10, 12);
    const s = monthChartSeries([], [], 2026, 7, 50, now);
    expect(s.actual).toHaveLength(10);
    expect(s.actual.every((p) => p.hours === 0 && !p.isChange)).toBe(true);
  });

  it("нулевая цель не ломает шкалу", () => {
    const now = new Date(2026, 6, 10, 12);
    const s = monthChartSeries([], [], 2026, 7, 0, now);
    expect(s.goalHours).toBe(0);
    expect(noNonsense(s.yTicks)).toBe(true);
    expect(idealHoursAt(s, s.totalUnits)).toBe(0);
  });

  it("превышение цели расширяет шкалу Y, а идеальный темп всё равно кончается на цели", () => {
    const now = new Date(2026, 6, 10, 12);
    const s = monthChartSeries([], [session("2026-07-02", 62 * 60)], 2026, 7, 50, now);
    expect(s.maxY).toBeGreaterThan(62);
    expect(idealHoursAt(s, s.totalUnits)).toBe(50);
  });

  it("идеальный темп — прямая от 0 до цели в последний день", () => {
    const now = new Date(2026, 6, 10, 12);
    const s = monthChartSeries([], [], 2026, 7, 50, now);
    expect(idealHoursAt(s, 0)).toBe(0);
    expect(idealHoursAt(s, 31)).toBe(50);
    expect(idealHoursAt(s, 16)).toBeCloseTo((50 * 16) / 31, 5);
  });
});

describe("monthChartSeries — легаси-месяц без дневных дат", () => {
  it("не выдумывает дневную линию из месячного итога", () => {
    const now = new Date(2026, 7, 5);
    const s = monthChartSeries([record(2026, 6, 43)], [], 2026, 6, 50, now);
    expect(s.legacyOnly).toBe(true);
    expect(s.hasDailyData).toBe(false);
    expect(s.actual).toEqual([]);
    expect(s.lastActualIndex).toBeNull();
  });

  it("месяц с сессиями не считается легаси, даже если по нему есть старая запись", () => {
    const now = new Date(2026, 7, 5);
    const s = monthChartSeries([record(2026, 7, 43)], [session("2026-07-04", 60)], 2026, 7, 50, now);
    expect(s.legacyOnly).toBe(false);
    // Легаси-часы проигнорированы целиком (как в resolveMonthTotal) — 1 ч, не 44
    expect(s.actual[30].hours).toBeCloseTo(1, 5);
  });
});

describe("yearChartSeries", () => {
  it("ось X — каждый день служебного года Сен..Авг, подписи только по месяцам", () => {
    const now = new Date(2026, 11, 1); // год уже завершён
    const s = yearChartSeries([], [], "2025–2026", 600, now);
    expect(s.totalUnits).toBe(365);
    expect(s.xLabels).toHaveLength(12);
    expect(s.xLabels.map((l) => l.label)).toEqual(["сен", "окт", "ноя", "дек", "янв", "фев", "мар", "апр", "май", "июн", "июл", "авг"]);
    // Подписи стоят внутри своих месяцев и строго по возрастанию
    expect(s.xLabels[0].index).toBe(16); // середина сентября
    expect(s.xLabels.every((l, i) => i === 0 || l.index > s.xLabels[i - 1].index)).toBe(true);
    expect(s.xLabels[11].index).toBeLessThanOrEqual(s.totalUnits);
    expect(s.gridIndices).toHaveLength(12); // сетка по границам месяцев, не по 365 дням
    expect(s.gridIndices[0]).toBe(1);
  });

  it("високосный служебный год длиннее на день", () => {
    const now = new Date(2025, 0, 1);
    expect(yearChartSeries([], [], "2023–2024", 600, now).totalUnits).toBe(366);
  });

  it("факт строится по реальным датам сессий и обрывается сегодня", () => {
    const now = new Date(2025, 9, 5, 12); // 5 октября 2025
    const s = yearChartSeries([], [session("2025-09-10", 10 * 60), session("2025-10-02", 5 * 60)], "2025–2026", 600, now);
    expect(s.lastActualIndex).toBe(35); // 30 дней сентября + 5
    expect(s.actual[s.actual.length - 1].hours).toBeCloseTo(15, 5);
    expect(s.actual.some((p) => p.index > 35)).toBe(false);
    expect(s.hasDailyData).toBe(true);
    expect(s.approximateMonths).toEqual([]);
  });

  it("завершённый служебный год доводится до последнего дня периода", () => {
    const now = new Date(2026, 11, 1);
    const s = yearChartSeries([], [session("2025-09-10", 10 * 60)], "2025–2026", 600, now);
    expect(s.lastActualIndex).toBe(365);
    expect(s.actual[364].hours).toBeCloseTo(10, 5);
  });

  it("будущий служебный год — фактической линии нет", () => {
    const now = new Date(2026, 0, 1);
    const s = yearChartSeries([], [], "2030–2031", 600, now);
    expect(s.actual).toEqual([]);
    expect(s.lastActualIndex).toBeNull();
  });

  it("легаси-месяц входит одним шагом в свой последний день и честно помечается", () => {
    const now = new Date(2026, 11, 1);
    const s = yearChartSeries([record(2025, 9, 40)], [], "2025–2026", 600, now);
    expect(s.approximateMonths).toEqual(["Сентябрь 2025"]);
    expect(s.actual[28].hours).toBe(0); // 29 сентября — итог ещё не приписан
    expect(s.actual[29].hours).toBeCloseTo(40, 5); // 30 сентября — шаг на весь месяц
    expect(s.hasDailyData).toBe(false);
  });

  it("легаси и Session-месяцы в одном ряду без двойного учёта", () => {
    const now = new Date(2026, 11, 1);
    const records = [record(2025, 9, 40), record(2025, 10, 99)]; // октябрь перекрыт сессиями
    const sessions = [session("2025-10-05", 60 * 60)];
    const s = yearChartSeries(records, sessions, "2025–2026", 600, now);
    expect(s.actual[364].hours).toBeCloseTo(100, 5); // 40 + 60, а не 199 (легаси-октябрь проигнорирован)
    expect(s.approximateMonths).toEqual(["Сентябрь 2025"]);
  });

  it("конец фактической линии совпадает с итогом карточки — цифра и график не расходятся", () => {
    const now = new Date(2026, 11, 1);
    const records = [record(2025, 9, 40)];
    const sessions = [session("2025-10-05", 60 * 60), session("2026-03-02", 30 * 60)];
    const s = yearChartSeries(records, sessions, "2025–2026", 600, now);
    const summary = yearPeriodSummary(records, sessions, "2025–2026", 600, now);
    expect(s.actual[s.actual.length - 1].hours).toBeCloseTo(summary.doneHours, 5);
  });

  it("пустой служебный год и нулевая цель не дают NaN/бесконечностей", () => {
    const now = new Date(2026, 2, 1);
    const s = yearChartSeries([], [], "2025–2026", 0, now);
    expect(noNonsense(s.yTicks)).toBe(true);
    expect(noNonsense(s.actual.map((p) => p.hours))).toBe(true);
    expect(Number.isFinite(s.maxY)).toBe(true);
  });
});
