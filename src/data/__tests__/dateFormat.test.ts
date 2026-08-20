// TASK_018 — date-presentation helpers for the "Последние события" card.
// TASK_022 — formatDateDMY became the app-wide canonical full-date display
// formatter; parseDMYToISO/isValidDMY added for the Add/Edit forms.
import {
  calendarElapsed,
  formatDateDMY,
  formatDateHuman,
  formatElapsedRu,
  formatHistoryListDate,
  formatProfileEventElapsed,
  isValidDMY,
  parseDMYToISO,
  pluralDaysRu,
  pluralMonthsRu,
  pluralYearsRu,
  upcomingDateLabel,
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

// TASK_048 — Home-scoped human date presentation. These replace the raw
// DD-MM-YYYY form on Home's event cards only; formatDateDMY() above stays
// canonical for forms, History, the timer, the timeline and Profile.
describe("formatDateHuman (TASK_048)", () => {
  const now = new Date(2026, 7, 20); // 20 August 2026

  it("omits the year when the date falls in the current year", () => {
    expect(formatDateHuman("2026-09-04", now)).toBe("4 сентября");
  });

  it("includes the year when it differs from the current year", () => {
    expect(formatDateHuman("2024-03-02", now)).toBe("2 марта 2024");
    expect(formatDateHuman("2027-01-09", now)).toBe("9 января 2027");
  });

  it("uses the genitive month form and drops the leading day zero", () => {
    expect(formatDateHuman("2026-08-05", now)).toBe("5 августа");
  });

  it.each([
    ["2026-01-15", "15 января"],
    ["2026-02-15", "15 февраля"],
    ["2026-03-15", "15 марта"],
    ["2026-04-15", "15 апреля"],
    ["2026-05-15", "15 мая"],
    ["2026-06-15", "15 июня"],
    ["2026-07-15", "15 июля"],
    ["2026-08-15", "15 августа"],
    ["2026-09-15", "15 сентября"],
    ["2026-10-15", "15 октября"],
    ["2026-11-15", "15 ноября"],
    ["2026-12-15", "15 декабря"],
  ])("formats %s as %s", (iso, expected) => {
    expect(formatDateHuman(iso, now)).toBe(expected);
  });

  it("never emits the technical DD-MM-YYYY form", () => {
    expect(formatDateHuman("2026-08-20", now)).not.toMatch(/\d{2}-\d{2}-\d{4}/);
  });

  it("returns malformed input unchanged instead of crashing", () => {
    expect(formatDateHuman("not-a-date", now)).toBe("not-a-date");
    expect(formatDateHuman("2026-13-01", now)).toBe("2026-13-01");
  });
});

describe("upcomingDateLabel (TASK_048)", () => {
  const now = new Date(2026, 7, 20); // 20 August 2026
  const iso = (y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  it("says Сегодня for today, with no redundant calendar date", () => {
    const label = upcomingDateLabel(iso(2026, 8, 20), now);
    expect(label.primary).toBe("Сегодня");
    expect(label.secondary).toBeNull();
    expect(label.urgency).toBe("today");
  });

  it("says Завтра for tomorrow, with no redundant calendar date", () => {
    const label = upcomingDateLabel(iso(2026, 8, 21), now);
    expect(label.primary).toBe("Завтра");
    expect(label.secondary).toBeNull();
    expect(label.urgency).toBe("tomorrow");
  });

  it("says 'Через 15 дней' plus the calendar date for a mid-range event", () => {
    const label = upcomingDateLabel(iso(2026, 9, 4), now);
    expect(label.primary).toBe("Через 15 дней");
    expect(label.secondary).toBe("4 сентября");
    expect(label.urgency).toBe("later");
  });

  it("marks the next few days as 'soon' but still names the day count", () => {
    const label = upcomingDateLabel(iso(2026, 8, 23), now);
    expect(label.primary).toBe("Через 3 дня");
    expect(label.urgency).toBe("soon");
  });

  it("switches to a plain calendar date past the 30-day relative horizon", () => {
    const label = upcomingDateLabel(iso(2026, 10, 6), now);
    expect(label.primary).toBe("6 октября");
    expect(label.secondary).toBeNull();
    expect(label.urgency).toBe("later");
  });

  it("keeps the relative phrase exactly at the 30-day boundary", () => {
    expect(upcomingDateLabel(iso(2026, 9, 19), now).primary).toBe("Через 30 дней");
    expect(upcomingDateLabel(iso(2026, 9, 20), now).primary).toBe("20 сентября");
  });

  it("flags a past date as overdue in words, not by color alone", () => {
    const label = upcomingDateLabel(iso(2026, 8, 18), now);
    expect(label.primary).toBe("Просрочено");
    expect(label.secondary).toBe("18 августа");
    expect(label.urgency).toBe("overdue");
  });

  it("uses correct Russian day plurals across the relative range", () => {
    expect(upcomingDateLabel(iso(2026, 8, 22), now).primary).toBe("Через 2 дня");
    expect(upcomingDateLabel(iso(2026, 8, 25), now).primary).toBe("Через 5 дней");
    expect(upcomingDateLabel(iso(2026, 9, 10), now).primary).toBe("Через 21 день");
  });

  it("never emits the technical DD-MM-YYYY form in either slot", () => {
    for (const day of [18, 20, 21, 23, 30]) {
      const label = upcomingDateLabel(iso(2026, 8, day), now);
      expect(label.primary).not.toMatch(/\d{2}-\d{2}-\d{4}/);
      expect(label.secondary ?? "").not.toMatch(/\d{2}-\d{2}-\d{4}/);
    }
  });

  it("is unaffected by the time of day (calendar-day math, not elapsed ms)", () => {
    const lateEvening = new Date(2026, 7, 20, 23, 59, 59);
    const earlyMorning = new Date(2026, 7, 20, 0, 0, 1);
    expect(upcomingDateLabel(iso(2026, 8, 21), lateEvening).primary).toBe("Завтра");
    expect(upcomingDateLabel(iso(2026, 8, 21), earlyMorning).primary).toBe("Завтра");
  });

  it("degrades gracefully on malformed input", () => {
    const label = upcomingDateLabel("nonsense", now);
    expect(label.primary).toBe("nonsense");
    expect(label.urgency).toBe("later");
  });
});
