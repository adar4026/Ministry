// Pure month-grid builder for the "Добавить время" date calendar
// (TASK_030). No RN/React — just calendar math, independently testable.
// Week starts Monday (owner requirement); leading/trailing days outside
// the target month are `null` cells, not muted numbers (matches the
// owner's reference screenshot: an empty first row before day 1).

export const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

// JS `getDay()` is 0=Sunday..6=Saturday; convert to a Monday-first index
// (0=Monday..6=Sunday) for the leading-blank-cell count.
function mondayFirstWeekday(year: number, monthIndex0: number, day: number): number {
  const jsDay = new Date(year, monthIndex0, day).getDay();
  return (jsDay + 6) % 7;
}

// Returns a rectangular grid (array of 7-cell weeks) for the given
// calendar month. `monthIndex0` is 0-based (0 = January), matching
// `Date`'s convention. Cells outside the month are `null`. Always a whole
// number of weeks (no partial trailing row) so every row renders 7 columns.
export function buildMonthGrid(year: number, monthIndex0: number): (number | null)[][] {
  const total = daysInMonth(year, monthIndex0);
  const leading = mondayFirstWeekday(year, monthIndex0, 1);

  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// One calendar month forward/back, wrapping the year at the Dec/Jan
// boundary in either direction.
export function addMonths(year: number, monthIndex0: number, delta: number): { year: number; monthIndex0: number } {
  const total = year * 12 + monthIndex0 + delta;
  return { year: Math.floor(total / 12), monthIndex0: ((total % 12) + 12) % 12 };
}
