// TASK_045 — exact calendar-based elapsed/remaining time for the "События"
// screen's event/talk cards, replacing the old whole-month-rounded
// timeElapsed(). See src/data/eventElapsed.ts for why this is independent
// from dateFormat.ts's calendarElapsed()/formatElapsedRu().
import { eventElapsed, formatEventElapsed } from "@/data/eventElapsed";

function elapsedStr(iso: string, now: Date): string {
  return formatEventElapsed(eventElapsed(iso, now));
}

describe("eventElapsed / formatEventElapsed (TASK_045)", () => {
  it("shows 'Сегодня' for the same day", () => {
    expect(elapsedStr("2026-07-18", new Date(2026, 6, 18))).toBe("Сегодня");
  });

  it("shows days-only for a past date under a month (task example: 12 дн.)", () => {
    expect(elapsedStr("2026-07-06", new Date(2026, 6, 18))).toBe("прошло 12 дн.");
  });

  it("shows exact remainder days, not rounded to the whole month (task example: 1 мес. 15 дн.)", () => {
    expect(elapsedStr("2026-06-03", new Date(2026, 6, 18))).toBe("прошло 1 мес. 15 дн.");
  });

  it("task example: 2 мес. 3 дн.", () => {
    expect(elapsedStr("2026-05-15", new Date(2026, 6, 18))).toBe("прошло 2 мес. 3 дн.");
  });

  it("task example: 1 г. 4 мес. 8 дн.", () => {
    expect(elapsedStr("2025-03-10", new Date(2026, 6, 18))).toBe("прошло 1 г. 4 мес. 8 дн.");
  });

  it("task example (future): через 2 мес. 6 дн.", () => {
    expect(elapsedStr("2026-09-24", new Date(2026, 6, 18))).toBe("через 2 мес. 6 дн.");
  });

  it("omits zero-value parts for a past date", () => {
    expect(elapsedStr("2026-06-18", new Date(2026, 6, 18))).toBe("прошло 1 мес.");
    expect(elapsedStr("2024-07-18", new Date(2026, 6, 18))).toBe("прошло 2 г.");
  });

  it("omits zero-value parts for a future date", () => {
    expect(elapsedStr("2026-08-18", new Date(2026, 6, 18))).toBe("через 1 мес.");
  });

  it("uses the 'через' prefix and full years/months/days for a far future date", () => {
    const elapsed = eventElapsed("2028-01-01", new Date(2026, 6, 18));
    expect(elapsed.isFuture).toBe(true);
    expect(elapsed.years).toBe(1);
    expect(formatEventElapsed(elapsed)).toMatch(/^через /);
  });

  it("does not round or truncate the day remainder for either direction", () => {
    // 2026-07-18 -> 2026-09-01: 1 month 14 days exactly.
    expect(elapsedStr("2026-09-01", new Date(2026, 6, 18))).toBe("через 1 мес. 14 дн.");
  });

  it("handles a transition across the end of a month", () => {
    // Jan 31 to Mar 1 is 1 month 1 day (clamped end-of-month anchor).
    expect(elapsedStr("2026-01-31", new Date(2026, 2, 1))).toBe("прошло 1 мес. 1 дн.");
  });

  it("handles February in a non-leap year", () => {
    expect(elapsedStr("2025-01-29", new Date(2025, 1, 28))).toBe("прошло 1 мес.");
    expect(elapsedStr("2025-01-29", new Date(2025, 2, 1))).toBe("прошло 1 мес. 1 дн.");
  });

  it("handles February in a leap year", () => {
    expect(elapsedStr("2024-01-29", new Date(2024, 1, 29))).toBe("прошло 1 мес.");
    expect(elapsedStr("2024-02-29", new Date(2024, 2, 1))).toBe("прошло 1 дн.");
  });

  it("handles a leap-year boundary spanning a full year", () => {
    expect(elapsedStr("2024-02-29", new Date(2025, 2, 1))).toBe("прошло 1 г. 1 дн.");
  });

  it("is symmetric: the future phrasing for N days ahead matches the past phrasing for N days behind", () => {
    const now = new Date(2026, 6, 18);
    expect(elapsedStr("2026-07-08", now)).toBe("прошло 10 дн.");
    expect(elapsedStr("2026-07-28", now)).toBe("через 10 дн.");
  });

  it("is unaffected by time-of-day on `now`", () => {
    const now = new Date(2026, 6, 18, 23, 45);
    expect(elapsedStr("2026-05-15", now)).toBe("прошло 2 мес. 3 дн.");
  });

  it("does not produce an off-by-one for an event dated exactly today regardless of time zone shift risk", () => {
    const now = new Date(2026, 6, 18, 0, 1);
    expect(elapsedStr("2026-07-18", now)).toBe("Сегодня");
  });

  it("returns malformed input as zero/past without crashing", () => {
    const elapsed = eventElapsed("not-a-date", new Date(2026, 6, 18));
    expect(elapsed).toEqual({ years: 0, months: 0, days: 0, isFuture: false, isToday: false });
  });
});
