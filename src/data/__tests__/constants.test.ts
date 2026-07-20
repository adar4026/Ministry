import {
  dayWord,
  formatClockDuration,
  formatHMRounded,
  monthWord,
  relativeDays,
  roundDurationToNearestFive,
  upcomingItems,
} from "@/data/constants";
import type { MinistryEvent, Talk } from "@/types";

describe("formatClockDuration (TASK_032 History calendar/list)", () => {
  it("formats zero as 0:00", () => {
    expect(formatClockDuration(0)).toBe("0:00");
  });

  it("formats a whole hour with two-digit zero minutes", () => {
    expect(formatClockDuration(60)).toBe("1:00");
  });

  it("pads a single-digit minute count to two digits", () => {
    expect(formatClockDuration(65)).toBe("1:05");
  });

  it("formats 3h30m", () => {
    expect(formatClockDuration(210)).toBe("3:30");
  });

  it("formats 10h50m", () => {
    expect(formatClockDuration(650)).toBe("10:50");
  });

  it("formats a duration under one hour with a leading 0 before the colon", () => {
    expect(formatClockDuration(20)).toBe("0:20");
  });
});

describe("roundDurationToNearestFive", () => {
  it("rounds a remainder of 0-2 down", () => {
    expect(roundDurationToNearestFive(0)).toBe(0);
    expect(roundDurationToNearestFive(46)).toBe(45);
    expect(roundDurationToNearestFive(47)).toBe(45);
  });

  it("rounds a remainder of 3-4 up", () => {
    expect(roundDurationToNearestFive(48)).toBe(50);
    expect(roundDurationToNearestFive(49)).toBe(50);
  });

  it("leaves an already-5-aligned value unchanged", () => {
    expect(roundDurationToNearestFive(150)).toBe(150);
    expect(roundDurationToNearestFive(0)).toBe(0);
  });

  it("rolls over into the next hour when rounding reaches 60", () => {
    expect(roundDurationToNearestFive(58)).toBe(60);
  });

  it("handles values above one hour", () => {
    expect(roundDurationToNearestFive(107)).toBe(105);
    expect(roundDurationToNearestFive(108)).toBe(110);
  });

  it("handles the upper supported boundary (24h) without breaking rollover", () => {
    expect(roundDurationToNearestFive(24 * 60 - 2)).toBe(24 * 60);
  });
});

describe("relativeDays (TASK_020A — compact 'мес'/'д.' abbreviations, no declension)", () => {
  it("shows full months plus remaining days (2026-05-15 -> 2026-08-04)", () => {
    const now = new Date(2026, 4, 15); // 15 мая 2026
    expect(relativeDays("2026-08-04", now)).toBe("Через 2 мес 20 д.");
  });

  it("shows 1 month and 1 day", () => {
    const now = new Date(2026, 6, 18);
    expect(relativeDays("2026-08-19", now)).toBe("Через 1 мес 1 д.");
  });

  it("shows days only when under a full calendar month", () => {
    const now = new Date(2026, 6, 18);
    expect(relativeDays("2026-08-07", now)).toBe("Через 20 д.");
    expect(relativeDays("2026-07-19", now)).toBe("Через 1 д.");
  });

  it("omits the day part for an exact number of full months (no '0 д.')", () => {
    const now = new Date(2026, 6, 18);
    const result = relativeDays("2026-09-18", now);
    expect(result).toBe("Через 2 мес");
    expect(result).not.toContain("0 д.");
  });

  it("shows 'Сегодня' for an event occurring today", () => {
    const now = new Date(2026, 6, 18);
    expect(relativeDays("2026-07-18", now)).toBe("Сегодня");
  });

  it("handles a transition across the end of the year", () => {
    const now = new Date(2026, 11, 20); // 20 декабря 2026
    expect(relativeDays("2027-01-05", now)).toBe("Через 16 д.");
    expect(relativeDays("2027-02-20", now)).toBe("Через 2 мес");
    expect(relativeDays("2027-02-25", now)).toBe("Через 2 мес 5 д.");
  });

  it("clamps end-of-month overflow (Jan 31 + 1 month lands on Feb 28, non-leap)", () => {
    const now = new Date(2025, 0, 31); // 31 января 2025 (non-leap year)
    // Jan 31 + 1 calendar month clamps to Feb 28 (2025 is not a leap year) —
    // that clamped anchor lands exactly on the target, so it's "1 month",
    // not "28 days" (which a naive diff-in-days-then-round would show).
    expect(relativeDays("2025-02-28", now)).toBe("Через 1 мес");
    expect(relativeDays("2025-03-02", now)).toBe("Через 1 мес 2 д.");
  });

  it("handles February and leap years", () => {
    const now = new Date(2024, 0, 29); // 29 января 2024 (leap year)
    expect(relativeDays("2024-02-29", now)).toBe("Через 1 мес");
  });

  it("is unaffected by time-of-day on either date", () => {
    const now = new Date(2026, 4, 15, 23, 45);
    expect(relativeDays("2026-08-04", now)).toBe("Через 2 мес 20 д.");
  });

  it("uses the compact 'мес'/'д.' abbreviation regardless of count (no plural declension)", () => {
    const now = new Date(2026, 0, 1);
    expect(relativeDays("2026-02-01", now)).toBe("Через 1 мес");
    expect(relativeDays("2026-03-01", now)).toBe("Через 2 мес");
    expect(relativeDays("2026-06-01", now)).toBe("Через 5 мес");
    expect(relativeDays("2026-01-02", now)).toBe("Через 1 д.");
    expect(relativeDays("2026-01-03", now)).toBe("Через 2 д.");
    expect(relativeDays("2026-01-06", now)).toBe("Через 5 д.");
  });

  it("keeps monthWord()/dayWord() full plural declension unchanged for their own (unrelated) call sites", () => {
    expect(monthWord(1)).toBe("месяц");
    expect(monthWord(2)).toBe("месяца");
    expect(monthWord(5)).toBe("месяцев");
    expect(monthWord(21)).toBe("месяц");
    expect(monthWord(22)).toBe("месяца");
    expect(monthWord(25)).toBe("месяцев");

    expect(dayWord(1)).toBe("день");
    expect(dayWord(2)).toBe("дня");
    expect(dayWord(5)).toBe("дней");
    expect(dayWord(21)).toBe("день");
    expect(dayWord(22)).toBe("дня");
    expect(dayWord(25)).toBe("дней");
  });
});

describe("formatHMRounded (TASK_014 — Home month card display rounding)", () => {
  it("rounds 12h32m down to 12h30m", () => {
    expect(formatHMRounded(12 + 32 / 60)).toBe("12 ч 30 м");
  });

  it("rounds 12h33m up to 12h35m", () => {
    expect(formatHMRounded(12 + 33 / 60)).toBe("12 ч 35 м");
  });

  it("rounds 12h37m down to 12h35m", () => {
    expect(formatHMRounded(12 + 37 / 60)).toBe("12 ч 35 м");
  });

  it("rounds 12h38m up to 12h40m", () => {
    expect(formatHMRounded(12 + 38 / 60)).toBe("12 ч 40 м");
  });

  it("rolls 59 minutes over into the next hour", () => {
    expect(formatHMRounded(59 / 60)).toBe("1 ч");
  });

  it("formats zero minutes without a trailing '0 м'", () => {
    expect(formatHMRounded(0)).toBe("0 ч");
  });

  it("clamps a negative input to zero instead of a negative duration", () => {
    expect(formatHMRounded(-5)).toBe("0 ч");
  });

  it("never leaves an irregular (non-multiple-of-5) minute value in the output", () => {
    expect(formatHMRounded(37 + 37 / 60)).toBe("37 ч 35 м");
  });
});

// TASK_019: upcomingItems() is the single shared selector behind both
// Home's "Ближайшие события" preview (limit 3) and the dedicated
// /upcoming-events screen (no limit).
describe("upcomingItems", () => {
  const NOW = new Date(2026, 6, 18); // 2026-07-18, local time — no Date parsing of the ISO strings themselves

  function ev(id: string, date: string): MinistryEvent {
    return { id, date, title: `Event ${id}`, category: "other" };
  }
  function talk(id: string, date: string): Talk {
    return { id, date, number: null, title: `Talk ${id}`, location: "" };
  }

  it("excludes past events", () => {
    const items = upcomingItems([ev("past", "2026-07-17")], [], NOW);
    expect(items).toEqual([]);
  });

  it("includes today's events (existing project semantics: date >= today)", () => {
    const items = upcomingItems([ev("today", "2026-07-18")], [], NOW);
    expect(items.map((i) => i.id)).toEqual(["today"]);
  });

  it("includes future events", () => {
    const items = upcomingItems([ev("future", "2026-08-01")], [], NOW);
    expect(items.map((i) => i.id)).toEqual(["future"]);
  });

  it("sorts nearest-first regardless of input order", () => {
    const events = [ev("far", "2027-01-01"), ev("near", "2026-07-19"), ev("mid", "2026-09-01")];
    const items = upcomingItems(events, [], NOW);
    expect(items.map((i) => i.id)).toEqual(["near", "mid", "far"]);
  });

  it("with a limit, Home selection returns exactly the first three of more than three", () => {
    const events = [1, 2, 3, 4, 5].map((n) => ev(`e${n}`, `2026-08-0${n}`));
    const items = upcomingItems(events, [], NOW, 3);
    expect(items.map((i) => i.id)).toEqual(["e1", "e2", "e3"]);
  });

  it("without a limit, the full selection returns all upcoming events with no arbitrary window", () => {
    const events = [1, 2, 3, 4, 5].map((n) => ev(`e${n}`, `2026-08-0${n}`));
    const farFuture = ev("far", "2099-01-01");
    const items = upcomingItems([...events, farFuture], [], NOW);
    expect(items.map((i) => i.id)).toEqual(["e1", "e2", "e3", "e4", "e5", "far"]);
  });

  it("handles fewer than three events without padding or crashing", () => {
    const items = upcomingItems([ev("a", "2026-07-20")], [], NOW, 3);
    expect(items.map((i) => i.id)).toEqual(["a"]);
  });

  it("preserves deterministic ordering for identical dates via a stable id tiebreak", () => {
    const events = [ev("z", "2026-08-01"), ev("a", "2026-08-01")];
    expect(upcomingItems(events, [], NOW).map((i) => i.id)).toEqual(["a", "z"]);
    // Order-independent of input order — always sorted by id on a tie.
    expect(upcomingItems([...events].reverse(), [], NOW).map((i) => i.id)).toEqual(["a", "z"]);
  });

  it("combines events and talks into one sorted list", () => {
    const items = upcomingItems([ev("e1", "2026-08-05")], [talk("t1", "2026-07-19")], NOW);
    expect(items.map((i) => i.id)).toEqual(["t1", "e1"]);
  });

  it("does not produce a timezone off-by-one: an ISO date equal to today's local date is never excluded", () => {
    // toISODate(NOW) is computed from local date parts, and the comparison
    // is a plain string compare — no Date parsing of `date` happens here,
    // so there is no UTC/local shift to lose or gain a day.
    const items = upcomingItems([ev("today", "2026-07-18")], [], NOW);
    expect(items).toHaveLength(1);
  });

  it("returns an empty result for empty input", () => {
    expect(upcomingItems([], [], NOW)).toEqual([]);
    expect(upcomingItems([], [], NOW, 3)).toEqual([]);
  });
});
