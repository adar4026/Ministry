// TASK_018 — date-presentation helpers for the "Последние события" card.
// TASK_022 — formatDateDMY became the app-wide canonical full-date display
// formatter; parseDMYToISO/isValidDMY added for the Add/Edit forms.
import {
  calendarElapsed,
  formatDateDMY,
  formatElapsedRu,
  formatHistoryListDate,
  formatProfileEventElapsed,
  isValidDMY,
  parseDMYToISO,
  pluralDaysRu,
  pluralMonthsRu,
  pluralYearsRu,
} from "@/data/dateFormat";

describe("formatHistoryListDate (TASK_032 History list row)", () => {
  it("formats a date without startTime as day + short month + year, no time", () => {
    expect(formatHistoryListDate("2026-07-19")).toBe("19 июл. 2026");
  });

  it("appends HH:MM when startTime is provided", () => {
    expect(formatHistoryListDate("2026-07-19", "2026-07-19T15:34:00.000")).toBe("19 июл. 2026, 15:34");
  });

  it("never fabricates a time when startTime is undefined (manual entry)", () => {
    const out = formatHistoryListDate("2026-07-19", undefined);
    expect(out).not.toContain(",");
  });

  it("pads single-digit hour/minute in the time portion", () => {
    expect(formatHistoryListDate("2026-01-05", "2026-01-05T09:05:00.000")).toBe("5 янв. 2026, 09:05");
  });

  it.each([
    [1, "янв."],
    [2, "февр."],
    [3, "мар."],
    [4, "апр."],
    [5, "мая"],
    [6, "июн."],
    [7, "июл."],
    [8, "авг."],
    [9, "сент."],
    [10, "окт."],
    [11, "нояб."],
    [12, "дек."],
  ])("uses the correct short genitive form for month %i", (month, abbr) => {
    const iso = `2026-${String(month).padStart(2, "0")}-15`;
    expect(formatHistoryListDate(iso)).toBe(`15 ${abbr} 2026`);
  });

  it("returns malformed input unchanged", () => {
    expect(formatHistoryListDate("not-a-date")).toBe("not-a-date");
  });
});

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
    expect(elapsedRu("2025-07-18", new Date(2026, 6, 18))).toBe("1 г.");
  });

  it("2 years", () => {
    expect(elapsedRu("2024-07-18", new Date(2026, 6, 18))).toBe("2 г.");
  });

  it("5 years", () => {
    expect(elapsedRu("2021-07-18", new Date(2026, 6, 18))).toBe("5 г.");
  });

  it("1 month", () => {
    expect(elapsedRu("2026-06-18", new Date(2026, 6, 18))).toBe("1 мес.");
  });

  it("2 months", () => {
    expect(elapsedRu("2026-05-18", new Date(2026, 6, 18))).toBe("2 мес.");
  });

  it("5 months", () => {
    expect(elapsedRu("2026-02-18", new Date(2026, 6, 18))).toBe("5 мес.");
  });

  it("1 day", () => {
    expect(elapsedRu("2026-07-17", new Date(2026, 6, 18))).toBe("1 дн.");
  });

  it("2 days", () => {
    expect(elapsedRu("2026-07-16", new Date(2026, 6, 18))).toBe("2 дн.");
  });

  it("5 days", () => {
    expect(elapsedRu("2026-07-13", new Date(2026, 6, 18))).toBe("5 дн.");
  });

  it("11-14 plural exceptions reachable via calendarElapsed (11 years, 14 days) use the same fixed abbreviation, no grammatical exception", () => {
    expect(elapsedRu("2015-07-18", new Date(2026, 6, 18))).toBe("11 г.");
    expect(elapsedRu("2026-07-04", new Date(2026, 6, 18))).toBe("14 дн.");
  });

  it("21 vs 22 vs 25 years, reachable via calendarElapsed, all use the same fixed abbreviation", () => {
    expect(elapsedRu("2005-07-18", new Date(2026, 6, 18))).toBe("21 г.");
    expect(elapsedRu("2004-07-18", new Date(2026, 6, 18))).toBe("22 г.");
    expect(elapsedRu("2001-07-18", new Date(2026, 6, 18))).toBe("25 г.");
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
    expect(elapsedRu("2026-06-08", new Date(2026, 6, 18))).toBe("1 мес. 10 дн.");
  });

  it("omits zero-value units: 2y 0mo 3d", () => {
    expect(elapsedRu("2024-07-15", new Date(2026, 6, 18))).toBe("2 г. 3 дн.");
  });

  it("omits zero-value units: 0y 0mo 12d", () => {
    expect(elapsedRu("2026-07-06", new Date(2026, 6, 18))).toBe("12 дн.");
  });

  it("omits zero-value units: 3y 0mo 0d", () => {
    expect(elapsedRu("2023-07-18", new Date(2026, 6, 18))).toBe("3 г.");
  });

  it("multi-unit result: 2 years 2 months 3 days", () => {
    expect(elapsedRu("2024-05-15", new Date(2026, 6, 18))).toBe("2 г. 2 мес. 3 дн.");
  });

  it("no double spaces or other separators between parts", () => {
    expect(elapsedRu("2024-05-15", new Date(2026, 6, 18))).not.toMatch(/ {2}|,/);
  });

  it("leap-year boundary: Feb 29 2024 to Mar 1 2025 is 1 year 1 day", () => {
    expect(elapsedRu("2024-02-29", new Date(2025, 2, 1))).toBe("1 г. 1 дн.");
  });

  it("leap-year boundary: Feb 29 2024 to Feb 28 2025 is exactly 1 year (clamped end-of-month anniversary)", () => {
    expect(elapsedRu("2024-02-29", new Date(2025, 1, 28))).toBe("1 г.");
  });

  it("end-of-month case: Jan 31 to Mar 1 is 1 month 1 day", () => {
    expect(elapsedRu("2026-01-31", new Date(2026, 2, 1))).toBe("1 мес. 1 дн.");
  });

  it("future dates are handled safely without crashing or displaying negative time", () => {
    const elapsed = calendarElapsed("2099-01-01", new Date(2026, 6, 18));
    expect(elapsed.isFuture).toBe(true);
    expect(formatElapsedRu(elapsed)).toBe("");
  });
});

// TASK_042 — Profile hero card's compact duration format: no dots, no day
// component (unlike formatElapsedRu above), "менее 1 мес" instead of "0 дн."
describe("formatProfileEventElapsed (TASK_042 Profile hero card)", () => {
  function elapsed(iso: string, now: Date) {
    return formatProfileEventElapsed(calendarElapsed(iso, now));
  }

  it("shows years and months without dots when both are present", () => {
    expect(elapsed("2016-08-15", new Date(2026, 6, 20))).toBe("9 г 11 мес");
  });

  it("shows only years when months are exactly zero", () => {
    expect(elapsed("2024-07-20", new Date(2026, 6, 20))).toBe("2 г");
  });

  it("shows only months when years are zero", () => {
    expect(elapsed("2026-01-15", new Date(2026, 6, 20))).toBe("6 мес");
  });

  it("shows 'менее 1 мес' when less than a full calendar month has elapsed", () => {
    expect(elapsed("2026-07-05", new Date(2026, 6, 20))).toBe("менее 1 мес");
  });

  it("shows 'менее 1 мес' for today's date (zero elapsed)", () => {
    expect(elapsed("2026-07-20", new Date(2026, 6, 20))).toBe("менее 1 мес");
  });

  it("never uses the long-form 'года'/'месяцев' words", () => {
    const out = elapsed("2016-08-15", new Date(2026, 6, 20));
    expect(out).not.toMatch(/года|лет|месяц/);
  });

  it("never contains a day component or dots", () => {
    const out = elapsed("2016-08-17", new Date(2026, 6, 20));
    expect(out).not.toMatch(/дн\.?|\./);
  });

  it("handles a leap-year date without crashing", () => {
    expect(elapsed("2024-02-29", new Date(2026, 2, 1))).toBe("2 г");
  });

  it("does not produce a negative or future-looking result for a future date", () => {
    const out = elapsed("2099-01-01", new Date(2026, 6, 20));
    expect(out).toBe("менее 1 мес");
  });
});
