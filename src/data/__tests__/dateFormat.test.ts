// TASK_018 — date-presentation helpers for the "Последние события" card.
import {
  calendarElapsed,
  formatDateDMY,
  formatElapsedRu,
  pluralDaysRu,
  pluralMonthsRu,
  pluralYearsRu,
} from "@/data/dateFormat";

function elapsedRu(iso: string, now: Date): string {
  return formatElapsedRu(calendarElapsed(iso, now));
}

describe("formatDateDMY", () => {
  it("converts YYYY-MM-DD to DD-MM-YYYY", () => {
    expect(formatDateDMY("2026-05-24")).toBe("24-05-2026");
  });

  it("returns malformed input unchanged instead of throwing", () => {
    expect(formatDateDMY("not-a-date")).toBe("not-a-date");
  });
});

describe("calendarElapsed / formatElapsedRu", () => {
  it("renders 'Сегодня' for the same day", () => {
    expect(elapsedRu("2026-07-18", new Date(2026, 6, 18))).toBe("Сегодня");
  });

  it("1 year", () => {
    expect(elapsedRu("2025-07-18", new Date(2026, 6, 18))).toBe("1 год");
  });

  it("2 years", () => {
    expect(elapsedRu("2024-07-18", new Date(2026, 6, 18))).toBe("2 года");
  });

  it("5 years", () => {
    expect(elapsedRu("2021-07-18", new Date(2026, 6, 18))).toBe("5 лет");
  });

  it("1 month", () => {
    expect(elapsedRu("2026-06-18", new Date(2026, 6, 18))).toBe("1 месяц");
  });

  it("2 months", () => {
    expect(elapsedRu("2026-05-18", new Date(2026, 6, 18))).toBe("2 месяца");
  });

  it("5 months", () => {
    expect(elapsedRu("2026-02-18", new Date(2026, 6, 18))).toBe("5 месяцев");
  });

  it("1 day", () => {
    expect(elapsedRu("2026-07-17", new Date(2026, 6, 18))).toBe("1 день");
  });

  it("2 days", () => {
    expect(elapsedRu("2026-07-16", new Date(2026, 6, 18))).toBe("2 дня");
  });

  it("5 days", () => {
    expect(elapsedRu("2026-07-13", new Date(2026, 6, 18))).toBe("5 дней");
  });

  it("11-14 plural exceptions reachable via calendarElapsed (11 years, 14 days)", () => {
    expect(elapsedRu("2015-07-18", new Date(2026, 6, 18))).toBe("11 лет");
    expect(elapsedRu("2026-07-04", new Date(2026, 6, 18))).toBe("14 дней");
  });

  it("21 vs 22 vs 25 years, reachable via calendarElapsed", () => {
    expect(elapsedRu("2005-07-18", new Date(2026, 6, 18))).toBe("21 год");
    expect(elapsedRu("2004-07-18", new Date(2026, 6, 18))).toBe("22 года");
    expect(elapsedRu("2001-07-18", new Date(2026, 6, 18))).toBe("25 лет");
  });

  it("21/22/25 forms hold for every unit (years/months/days), including month counts calendarElapsed never reaches", () => {
    expect(pluralYearsRu(21)).toBe("год");
    expect(pluralYearsRu(22)).toBe("года");
    expect(pluralYearsRu(25)).toBe("лет");
    expect(pluralMonthsRu(11)).toBe("месяцев");
    expect(pluralMonthsRu(12)).toBe("месяцев");
    expect(pluralMonthsRu(21)).toBe("месяц");
    expect(pluralMonthsRu(22)).toBe("месяца");
    expect(pluralMonthsRu(25)).toBe("месяцев");
    expect(pluralDaysRu(11)).toBe("дней");
    expect(pluralDaysRu(12)).toBe("дней");
    expect(pluralDaysRu(14)).toBe("дней");
    expect(pluralDaysRu(21)).toBe("день");
    expect(pluralDaysRu(22)).toBe("дня");
    expect(pluralDaysRu(25)).toBe("дней");
  });

  it("omits zero-value units: 0y 1mo 10d", () => {
    expect(elapsedRu("2026-06-08", new Date(2026, 6, 18))).toBe("1 месяц 10 дней");
  });

  it("omits zero-value units: 2y 0mo 3d", () => {
    expect(elapsedRu("2024-07-15", new Date(2026, 6, 18))).toBe("2 года 3 дня");
  });

  it("omits zero-value units: 0y 0mo 12d", () => {
    expect(elapsedRu("2026-07-06", new Date(2026, 6, 18))).toBe("12 дней");
  });

  it("omits zero-value units: 3y 0mo 0d", () => {
    expect(elapsedRu("2023-07-18", new Date(2026, 6, 18))).toBe("3 года");
  });

  it("multi-unit result: 2 years 2 months 3 days", () => {
    expect(elapsedRu("2024-05-15", new Date(2026, 6, 18))).toBe("2 года 2 месяца 3 дня");
  });

  it("leap-year boundary: Feb 29 2024 to Mar 1 2025 is 1 year 1 day", () => {
    expect(elapsedRu("2024-02-29", new Date(2025, 2, 1))).toBe("1 год 1 день");
  });

  it("leap-year boundary: Feb 29 2024 to Feb 28 2025 is exactly 1 year (clamped end-of-month anniversary)", () => {
    expect(elapsedRu("2024-02-29", new Date(2025, 1, 28))).toBe("1 год");
  });

  it("end-of-month case: Jan 31 to Mar 1 is 1 month 1 day", () => {
    expect(elapsedRu("2026-01-31", new Date(2026, 2, 1))).toBe("1 месяц 1 день");
  });

  it("future dates are handled safely without crashing or displaying negative time", () => {
    const elapsed = calendarElapsed("2099-01-01", new Date(2026, 6, 18));
    expect(elapsed.isFuture).toBe(true);
    expect(formatElapsedRu(elapsed)).toBe("");
  });
});
