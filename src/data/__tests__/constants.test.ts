import { formatHMRounded, roundDurationToNearestFive, upcomingItems } from "@/data/constants";
import type { MinistryEvent, Talk } from "@/types";

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
