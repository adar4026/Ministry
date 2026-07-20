// TASK_038 — dedicated unit tests for the canonical service-year domain
// rule (src/data/serviceYear.ts). Every other module (constants.ts,
// stats.ts, periodStats.ts) delegates its Sep..Aug boundary logic here —
// this file is where that rule itself is proven correct, once, so it is
// never silently replaced by a calendar-year assumption again.
import {
  SERVICE_YEAR_START_MONTH,
  currentServiceYearEndYear,
  parseServiceYearLabel,
  serviceYearEndYear,
  serviceYearLabel,
  serviceYearMonths,
  serviceYearRange,
} from "../serviceYear";

describe("SERVICE_YEAR_START_MONTH", () => {
  it("is September (9)", () => {
    expect(SERVICE_YEAR_START_MONTH).toBe(9);
  });
});

describe("serviceYearEndYear", () => {
  it("January through August belong to the service year ending in the same calendar year", () => {
    for (let m = 1; m <= 8; m++) {
      expect(serviceYearEndYear(2026, m)).toBe(2026);
    }
  });

  it("September through December belong to the service year ending the *next* calendar year", () => {
    for (let m = 9; m <= 12; m++) {
      expect(serviceYearEndYear(2025, m)).toBe(2026);
    }
  });

  it("August and September are the exact pivot", () => {
    expect(serviceYearEndYear(2026, 8)).toBe(2026); // Aug still belongs to SY ending 2026
    expect(serviceYearEndYear(2026, 9)).toBe(2027); // Sep already belongs to SY ending 2027
  });
});

describe("currentServiceYearEndYear", () => {
  // Local Date constructors (not UTC "Z" ISO strings) on purpose:
  // currentServiceYearEndYear() reads getMonth()/getFullYear() in local
  // wall-clock time, so a UTC-midnight boundary like
  // "2026-08-31T23:59:59.000Z" would resolve to Sep 1 local in any
  // timezone east of UTC and silently flip the expectation — exactly the
  // UTC/local mismatch TASK_038 was filed to avoid.
  it("resolves January..August of `now` to the service year ending that calendar year", () => {
    expect(currentServiceYearEndYear(new Date(2026, 6, 19, 12, 0, 0))).toBe(2026); // Jul 19
    expect(currentServiceYearEndYear(new Date(2026, 0, 1, 0, 0, 0))).toBe(2026); // Jan 1
    expect(currentServiceYearEndYear(new Date(2026, 7, 31, 23, 59, 59))).toBe(2026); // Aug 31 23:59:59
  });

  it("resolves September..December of `now` to the service year ending the next calendar year", () => {
    expect(currentServiceYearEndYear(new Date(2026, 9, 19, 12, 0, 0))).toBe(2027); // Oct 19
    expect(currentServiceYearEndYear(new Date(2026, 8, 1, 0, 0, 0))).toBe(2027); // Sep 1 00:00:00
    expect(currentServiceYearEndYear(new Date(2026, 11, 31, 23, 59, 59))).toBe(2027); // Dec 31
  });

  it("defaults to the real current time when `now` is omitted", () => {
    expect(typeof currentServiceYearEndYear()).toBe("number");
  });
});

describe("serviceYearLabel / parseServiceYearLabel", () => {
  it("serviceYearLabel formats the end-year as a 'YYYY–YYYY' range", () => {
    expect(serviceYearLabel(2026)).toBe("2025–2026");
    expect(serviceYearLabel(2003)).toBe("2002–2003");
  });

  it("parseServiceYearLabel reads the label's own end-year, round-tripping with serviceYearLabel", () => {
    expect(parseServiceYearLabel("2025–2026")).toBe(2026);
    expect(parseServiceYearLabel(serviceYearLabel(2026))).toBe(2026);
  });
});

describe("serviceYearMonths", () => {
  it("returns exactly 12 months, September of (endYear-1) through August of endYear, in order", () => {
    expect(serviceYearMonths(2026)).toEqual([
      { year: 2025, month: 9 },
      { year: 2025, month: 10 },
      { year: 2025, month: 11 },
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
      { year: 2026, month: 2 },
      { year: 2026, month: 3 },
      { year: 2026, month: 4 },
      { year: 2026, month: 5 },
      { year: 2026, month: 6 },
      { year: 2026, month: 7 },
      { year: 2026, month: 8 },
    ]);
  });

  it("has no duplicate (year, month) pairs", () => {
    const months = serviceYearMonths(2026);
    const keys = months.map((m) => `${m.year}-${m.month}`);
    expect(new Set(keys).size).toBe(12);
  });

  it("shifts correctly for a different end-year (empty/future service years included)", () => {
    expect(serviceYearMonths(2003)[0]).toEqual({ year: 2002, month: 9 });
    expect(serviceYearMonths(2003)[11]).toEqual({ year: 2003, month: 8 });
  });
});

describe("serviceYearRange — half-open [start, endExclusive) boundary", () => {
  it("start is September 1 of (endYear - 1) at local midnight", () => {
    const { start } = serviceYearRange(2026);
    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(8); // 0-indexed: 8 = September
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
  });

  it("endExclusive is September 1 of endYear at local midnight — Sep 1 itself is NOT inside the range", () => {
    const { endExclusive } = serviceYearRange(2026);
    expect(endExclusive.getFullYear()).toBe(2026);
    expect(endExclusive.getMonth()).toBe(8);
    expect(endExclusive.getDate()).toBe(1);
    expect(endExclusive.getHours()).toBe(0);
  });

  it("August 31 23:59:59.999 is the last instant strictly inside the range", () => {
    const { endExclusive } = serviceYearRange(2026);
    const lastInstant = new Date(2026, 7, 31, 23, 59, 59, 999);
    expect(lastInstant.getTime()).toBeLessThan(endExclusive.getTime());
  });

  it("September 1 00:00:00.000 itself is not less than endExclusive — excluded, belongs to the next service year", () => {
    const { endExclusive } = serviceYearRange(2026);
    const sep1 = new Date(2026, 8, 1, 0, 0, 0, 0);
    expect(sep1.getTime()).not.toBeLessThan(endExclusive.getTime());
  });

  it("consecutive service years are contiguous: one year's endExclusive equals the next year's start", () => {
    const sy2026 = serviceYearRange(2026);
    const sy2027 = serviceYearRange(2027);
    expect(sy2026.endExclusive.getTime()).toBe(sy2027.start.getTime());
  });

  it("built from local Date fields, not UTC/ISO strings — getFullYear()/getMonth() read the intended local values directly", () => {
    const { start, endExclusive } = serviceYearRange(2026);
    // If this were built via a UTC ISO string in a timezone east of UTC,
    // local getMonth() could read August instead of September.
    expect(start.getMonth()).toBe(8);
    expect(endExclusive.getMonth()).toBe(8);
  });
});
