// TASK_018 — date-presentation helpers for the "Последние события" card.
// TASK_022 — formatDateDMY became the app-wide canonical full-date display
// formatter; parseDMYToISO/isValidDMY added for the Add/Edit forms.
import {
  calendarElapsed,
  formatDateDMY,
  formatElapsedRu,
  isValidDMY,
  parseDMYToISO,
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

  it("converts a mid-year date (task example)", () => {
    expect(formatDateDMY("2026-05-12")).toBe("12-05-2026");
  });

  it("keeps leading zeroes for the first day/month of a year", () => {
    expect(formatDateDMY("2026-01-01")).toBe("01-01-2026");
  });

  it("keeps leading zeroes for the last day of a year", () => {
    expect(formatDateDMY("2026-12-31")).toBe("31-12-2026");
  });

  it("never uses dots or slashes as the separator", () => {
    const out = formatDateDMY("2026-05-12");
    expect(out).not.toMatch(/[./]/);
  });

  it("returns malformed input unchanged instead of throwing", () => {
    expect(formatDateDMY("not-a-date")).toBe("not-a-date");
  });
});

describe("parseDMYToISO", () => {
  it("converts DD-MM-YYYY to YYYY-MM-DD", () => {
    expect(parseDMYToISO("12-05-2026")).toBe("2026-05-12");
  });

  it("keeps leading zeroes", () => {
    expect(parseDMYToISO("01-01-2026")).toBe("2026-01-01");
  });

  it("round-trips with formatDateDMY", () => {
    expect(parseDMYToISO(formatDateDMY("2026-05-12"))).toBe("2026-05-12");
    expect(formatDateDMY(parseDMYToISO("12-05-2026"))).toBe("12-05-2026");
  });

  it("returns malformed input unchanged instead of throwing", () => {
    expect(parseDMYToISO("2026-05-12")).toBe("2026-05-12");
    expect(parseDMYToISO("not-a-date")).toBe("not-a-date");
  });
});

describe("isValidDMY", () => {
  it("accepts a well-formed DD-MM-YYYY string", () => {
    expect(isValidDMY("12-05-2026")).toBe(true);
  });

  it("rejects ISO order", () => {
    expect(isValidDMY("2026-05-12")).toBe(false);
  });

  it("rejects dot or slash separators", () => {
    expect(isValidDMY("12.05.2026")).toBe(false);
    expect(isValidDMY("12/05/2026")).toBe(false);
  });

  it("rejects missing leading zeroes", () => {
    expect(isValidDMY("1-5-2026")).toBe(false);
  });

  it("rejects a 2-digit year or otherwise malformed input", () => {
    expect(isValidDMY("12-05-26")).toBe(false);
    expect(isValidDMY("not-a-date")).toBe(false);
    expect(isValidDMY("")).toBe(false);
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
