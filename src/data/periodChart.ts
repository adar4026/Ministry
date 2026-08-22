// Дневная модель графиков «Динамика часов» / «Динамика служебного года»
// (TASK_061). Отдельный модуль от src/data/periodStats.ts: тот отвечает за
// сводку периода (сделано/цель/остаток), этот — за ряд точек и шкалы
// большого графика. Обе модели читают факт через один и тот же примитив
// resolveMonthTotal()/dailyMinutesForMonth() (src/data/stats.ts), поэтому
// цифра в карточке и конец линии на графике не могут разойтись, а часы не
// могут быть посчитаны дважды.
//
// ГЛАВНОЕ ПРАВИЛО ДОСТОВЕРНОСТИ (TASK_061 §4): дневная линия строится
// только по Session — единственной сущности с реальной датой внесения
// (src/types/index.ts). Легаси-HourRecord хранит только месячный итог
// (year/month/hours), поэтому его часы НИКОГДА не распределяются по дням:
// на экране месяца линия факта в таком случае не рисуется вовсе, а на
// графике служебного года месяц без дневной детализации входит одним шагом
// в свой последний день (накопленный итог на конец месяца — точный факт;
// неизвестна только форма внутри месяца) и перечисляется в
// `approximateMonths`, чтобы UI мог честно это подписать.
import type { HourRecord, Session } from "@/types";
import { MF, MN, toISODate } from "@/data/constants";
import { idealCumulativeHours } from "@/data/cumulativeProgress";
import { dailyMinutesForMonth, sessionsForMonth } from "@/data/stats";
import { serviceYearBounds } from "@/data/periodStats";
import { parseServiceYearLabel, serviceYearMonths } from "@/data/serviceYear";

export type ChartPoint = {
  index: number; // 1-based day within the period
  hours: number; // cumulative actual hours through this day
  isChange: boolean; // true when hours actually grew on this day (marker-worthy)
};

export type PeriodChartSeries = {
  totalUnits: number; // days on the X axis: 28..31 for a month, 365/366 for a service year
  goalHours: number;
  // Cumulative actual, day 1..lastActualIndex. Empty when the period has no
  // elapsed days yet (future period) or when only a month total exists
  // without daily detail (`legacyOnly`).
  actual: ChartPoint[];
  lastActualIndex: number | null; // last day the fact line is allowed to reach
  maxY: number; // top of the Y scale — grows past the goal when the goal is exceeded
  yTicks: number[]; // 0..maxY, "nice" step
  xLabels: { index: number; label: string }[];
  gridIndices: number[]; // where vertical grid lines go
  hasDailyData: boolean; // at least one real dated Session inside the period
  legacyOnly: boolean; // month case: a HourRecord total exists but no daily breakdown
  approximateMonths: string[]; // months folded into a single end-of-month step
};

// Идеальный темп на день `index` периода: прямая от 0 в начале до цели в
// последний день. Делегирует уже существующей idealCumulativeHours()
// (src/data/cumulativeProgress.ts) — вторая формула «ровного темпа» в
// проекте не заводится. Это НЕ прогноз: значение не зависит от факта и в
// последний день всегда равно исходной цели, даже если факт её превысил.
export function idealHoursAt(series: Pick<PeriodChartSeries, "goalHours" | "totalUnits">, index: number): number {
  return idealCumulativeHours(series.goalHours, series.totalUnits, index);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// «Круглый» шаг оси Y: 0..max с шагом из ряда 1/2/2.5/5/10 × 10^n, ~5–7
// делений. Для цели 50 даёт 0,10,20,30,40,50; для 600 — 0,100,…,600.
// Никогда не возвращает NaN/Infinity и всегда как минимум два деления.
export function niceScale(peakValue: number, targetTicks = 6): { max: number; ticks: number[] } {
  if (!Number.isFinite(peakValue) || peakValue <= 0) return { max: 1, ticks: [0, 1] };
  const rawStep = peakValue / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = [1, 2, 2.5, 5, 10].map((c) => c * magnitude).find((c) => c >= rawStep - 1e-9) ?? 10 * magnitude;
  const max = Math.ceil(peakValue / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { max, ticks };
}

// Подпись деления оси Y — только число часов, без «ч» (единица объявлена
// заголовком блока), без пустых и дробно-шумных значений.
export function axisTickLabel(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}

function buildCumulative(deltasByDay: Map<number, number>, lastIndex: number | null): ChartPoint[] {
  if (lastIndex == null || lastIndex < 1) return [];
  const points: ChartPoint[] = [];
  let running = 0;
  for (let day = 1; day <= lastIndex; day++) {
    const delta = deltasByDay.get(day) ?? 0;
    running += delta;
    points.push({ index: day, hours: running, isChange: delta > 0 });
  }
  return points;
}

function scaleFor(points: ChartPoint[], goalHours: number): { maxY: number; yTicks: number[] } {
  const peakActual = points.length > 0 ? points[points.length - 1].hours : 0;
  const { max, ticks } = niceScale(Math.max(goalHours, peakActual));
  return { maxY: max, yTicks: ticks };
}

// Ось X месяца: подписи через каждые три дня (1, 4, 7, … ) — не каждый
// день, но и не «только начало и конец».
function monthXLabels(totalUnits: number): { index: number; label: string }[] {
  const labels: { index: number; label: string }[] = [];
  for (let day = 1; day <= totalUnits; day += 3) labels.push({ index: day, label: String(day) });
  return labels;
}

function allDays(totalUnits: number): number[] {
  return Array.from({ length: totalUnits }, (_, i) => i + 1);
}

// Ряд одного календарного месяца. `year`/`month` заданы явно (не выводятся
// из `now`) — экран месяца работает и для прошедшего, и для текущего, и для
// будущего месяца.
export function monthChartSeries(
  records: HourRecord[],
  sessions: Session[],
  year: number,
  month: number,
  goalHours: number,
  now: Date = new Date(),
): PeriodChartSeries {
  const totalUnits = new Date(year, month, 0).getDate();
  const monthSessions = sessionsForMonth(sessions, year, month);
  const hasDailyData = monthSessions.length > 0;
  const legacyHours = hasDailyData ? 0 : records.find((r) => r.year === year && r.month === month)?.hours ?? 0;
  const legacyOnly = !hasDailyData && legacyHours > 0;

  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const isCurrent = year === nowYear && month === nowMonth;
  const isPast = year < nowYear || (year === nowYear && month < nowMonth);

  // Линия факта заканчивается сегодня для текущего месяца и последним днём
  // для прошедшего; в будущий месяц она не продолжается вовсе.
  const lastActualIndex = legacyOnly ? null : isCurrent ? clamp(now.getDate(), 1, totalUnits) : isPast ? totalUnits : null;

  const deltas = new Map<number, number>();
  for (const [day, minutes] of dailyMinutesForMonth(sessions, year, month)) {
    if (day >= 1 && day <= totalUnits) deltas.set(day, (deltas.get(day) ?? 0) + minutes / 60);
  }

  const actual = buildCumulative(deltas, lastActualIndex);
  const { maxY, yTicks } = scaleFor(actual, goalHours);

  return {
    totalUnits,
    goalHours,
    actual,
    lastActualIndex: actual.length > 0 ? actual[actual.length - 1].index : null,
    maxY,
    yTicks,
    xLabels: monthXLabels(totalUnits),
    gridIndices: allDays(totalUnits),
    hasDailyData,
    legacyOnly,
    approximateMonths: [],
  };
}

// Ряд одного служебного года (Сен 1 … Авг 31) с дневным доменом X.
// Границы берутся из serviceYearBounds() (src/data/periodStats.ts →
// serviceYearRange(), src/data/serviceYear.ts) — календарный год здесь
// никогда не подставляется.
export function yearChartSeries(
  records: HourRecord[],
  sessions: Session[],
  syLabel: string,
  goalHours: number,
  now: Date = new Date(),
): PeriodChartSeries {
  const { start, end, totalDays } = serviceYearBounds(syLabel);
  const endYear = parseServiceYearLabel(syLabel);

  // Дни периода по локальному календарю (без UTC/ISO-арифметики — тот же
  // подход, что и в serviceYearRange(): только поля Date).
  const indexByISO = new Map<string, number>();
  const monthStartIndex = new Map<string, number>();
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const iso = toISODate(d);
    indexByISO.set(iso, i + 1);
    const ym = iso.slice(0, 7);
    if (!monthStartIndex.has(ym)) monthStartIndex.set(ym, i + 1);
  }

  const deltas = new Map<number, number>();
  const approximateMonths: string[] = [];
  let hasDailyData = false;

  for (const { year, month } of serviceYearMonths(endYear)) {
    const monthSessions = sessionsForMonth(sessions, year, month);
    if (monthSessions.length > 0) {
      // Session-авторитетный месяц: легаси-запись за него намеренно
      // игнорируется — ровно как в resolveMonthTotal(), поэтому часы не
      // удваиваются.
      hasDailyData = true;
      for (const s of monthSessions) {
        const idx = indexByISO.get(s.date);
        if (idx == null) continue;
        deltas.set(idx, (deltas.get(idx) ?? 0) + s.durationMinutes / 60);
      }
      continue;
    }
    const legacyHours = records.find((r) => r.year === year && r.month === month)?.hours ?? 0;
    if (legacyHours <= 0) continue;
    const lastDay = new Date(year, month, 0).getDate();
    const idx = indexByISO.get(`${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`);
    if (idx == null) continue;
    deltas.set(idx, (deltas.get(idx) ?? 0) + legacyHours);
    approximateMonths.push(`${MF[month - 1]} ${year}`);
  }

  const isCurrent = now.getTime() >= start.getTime() && now.getTime() <= end.getTime() + 24 * 60 * 60 * 1000 - 1;
  const isPast = now.getTime() > end.getTime() + 24 * 60 * 60 * 1000 - 1;
  const lastActualIndex = isCurrent ? indexByISO.get(toISODate(now)) ?? totalDays : isPast ? totalDays : null;

  const actual = buildCumulative(deltas, lastActualIndex);
  const { maxY, yTicks } = scaleFor(actual, goalHours);

  const monthStarts = serviceYearMonths(endYear).map(
    ({ year, month }) => monthStartIndex.get(`${year}-${String(month).padStart(2, "0")}`) ?? 1,
  );
  // Подпись месяца ставится в середину его отрезка, а не на границу: так
  // «сен» не прижимается к левому краю, а подписи не наезжают друг на друга.
  const xLabels = serviceYearMonths(endYear).map(({ year, month }, i) => ({
    index: monthStarts[i] + Math.floor(new Date(year, month, 0).getDate() / 2),
    label: MN[month - 1].toLowerCase(),
  }));

  return {
    totalUnits: totalDays,
    goalHours,
    actual,
    lastActualIndex: actual.length > 0 ? actual[actual.length - 1].index : null,
    maxY,
    yTicks,
    xLabels,
    // Вертикальная сетка года — по границам месяцев, а не по дням: 365
    // линий превратились бы в сплошную серую заливку.
    gridIndices: monthStarts,
    hasDailyData,
    legacyOnly: false,
    approximateMonths,
  };
}
