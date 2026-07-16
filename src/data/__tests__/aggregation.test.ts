// Unit tests for the TASK_005A Aggregation Layer — see
// docs/TASKS/TASK_005_ARCHITECTURE.md §7–§8 for the rule under test:
// Session aggregation is authoritative for a month once any Session exists
// for it; otherwise the legacy HourRecord is used. The two sources are
// never merged for the same month.
import {
  groupBySY,
  hoursForMonth,
  legacyEntryBlockReason,
  monthProgress,
  monthTotal,
  serviceYearAggregation,
  sessionsForMonth,
} from "@/data/constants";
import type { HourRecord, Session } from "@/types";

function record(year: number, month: number, hours: number, id = `r-${year}-${month}`): HourRecord {
  return { id, year, month, hours, note: "" };
}

function session(
  date: string,
  durationMinutes: number,
  overrides: Partial<Session> = {},
): Session {
  return {
    id: overrides.id ?? `s-${date}-${durationMinutes}`,
    date,
    durationMinutes,
    source: overrides.source ?? "manual",
    note: overrides.note ?? "",
    startTime: overrides.startTime,
    endTime: overrides.endTime,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
  };
}

describe("sessionsForMonth", () => {
  it("returns only sessions whose date falls in the given month", () => {
    const sessions = [
      session("2026-06-01", 60),
      session("2026-06-30", 30),
      session("2026-07-01", 45),
      session("2025-06-15", 90),
    ];
    const result = sessionsForMonth(sessions, 2026, 6);
    expect(result.map((s) => s.id)).toEqual([
      "s-2026-06-01-60",
      "s-2026-06-30-30",
    ]);
  });

  it("returns an empty array when no session matches", () => {
    expect(sessionsForMonth([], 2026, 6)).toEqual([]);
  });
});

describe("monthTotal", () => {
  it("falls back to the legacy HourRecord when no Session exists for the month", () => {
    const records = [record(2026, 6, 54)];
    expect(monthTotal(records, [], 2026, 6)).toBe(54);
  });

  it("returns 0 when neither a Session nor a HourRecord exists for the month", () => {
    expect(monthTotal([], [], 2026, 6)).toBe(0);
  });

  it("sums Session durations (in hours) when at least one Session exists, ignoring other months", () => {
    const sessions = [
      session("2026-06-01", 90), // 1.5h
      session("2026-06-15", 30), // 0.5h
      session("2026-07-01", 999), // different month, must not leak in
    ];
    expect(monthTotal([], sessions, 2026, 6)).toBe(2);
  });

  it("never merges the two sources — Session wins outright over HourRecord for the same month", () => {
    const records = [record(2026, 6, 54)];
    const sessions = [session("2026-06-01", 60)]; // 1h
    // If this were ever a sum (54 + 1 = 55) or an average, this assertion
    // would fail — the rule is exclusive, not additive.
    expect(monthTotal(records, sessions, 2026, 6)).toBe(1);
  });
});

// TASK_008 regression: the Hours Dashboard used to decide month authority by
// testing whether the Session total was > 0, not by testing whether a
// Session existed. Under real product flows (SessionForm blocks
// minutes <= 0; the Timer requires bankedSeconds > 0) that distinction is
// currently unreachable through the UI — but StoreContext.saveSession()
// performs no runtime validation, so the aggregation layer must not depend
// on a guarantee the storage layer doesn't enforce. These tests construct
// a zero-duration Session directly (bypassing the UI guards) to prove the
// primitive itself is existence-based, independent of any UI validation.
describe("monthTotal — TASK_008 Session-existence authority regression", () => {
  it("a zero-duration Session still makes the month Session-authoritative (existence, not sum)", () => {
    const records = [record(2026, 6, 54)];
    const sessions = [session("2026-06-01", 0)];
    // The old sum-based check (`sessionTotal > 0 ? sessionTotal : total`)
    // would have fallen back to the legacy 54 here. Existence-based
    // authority returns 0 — the Session's own (zero) total, never the
    // legacy fallback.
    expect(monthTotal(records, sessions, 2026, 6)).toBe(0);
  });

  it("legacy HourRecord is never consulted once any Session exists for the month, even a zero-duration one", () => {
    const records = [record(2026, 6, 54)];
    const sessions = [session("2026-06-01", 0), session("2026-06-15", 0)];
    expect(monthTotal(records, sessions, 2026, 6)).toBe(0);
  });

  it("legacy-only months (no Session at all) still resolve from the legacy total", () => {
    const records = [record(2026, 6, 54)];
    expect(monthTotal(records, [], 2026, 6)).toBe(54);
  });
});

describe("hoursForMonth (regression + session-aware)", () => {
  const now = new Date(2026, 5, 15); // June 2026

  it("keeps returning the legacy record's hours when called with just records (existing call sites)", () => {
    const records = [record(2026, 6, 54), record(2026, 5, 43)];
    expect(hoursForMonth(records, now)).toBe(54);
  });

  it("returns 0 for a month with no record and no sessions argument supplied", () => {
    expect(hoursForMonth([], now)).toBe(0);
  });

  it("reflects Session data when sessions are explicitly passed", () => {
    const records = [record(2026, 6, 54)];
    const sessions = [session("2026-06-10", 120)]; // 2h
    expect(hoursForMonth(records, now, sessions)).toBe(2);
  });
});

describe("monthProgress (regression + session-aware)", () => {
  it("computes hoursDone from the legacy record when sessions are omitted (unchanged behavior)", () => {
    const now = new Date(2026, 5, 15);
    const records = [record(2026, 6, 30)];
    const p = monthProgress(records, now);
    expect(p.hoursDone).toBe(30);
    expect(p.daysInMonth).toBe(30);
  });

  it("computes hoursDone from Session data when sessions are supplied", () => {
    const now = new Date(2026, 5, 15);
    const records = [record(2026, 6, 30)];
    const sessions = [session("2026-06-01", 300)]; // 5h
    const p = monthProgress(records, now, sessions);
    expect(p.hoursDone).toBe(5);
  });
});

describe("groupBySY (regression + documented limitation)", () => {
  it("returns byte-identical totals to the pre-TASK_005A behavior for legacy-only data", () => {
    const records = [
      record(2025, 9, 60),
      record(2025, 10, 55),
      record(2026, 1, 50),
    ];
    const groups = groupBySY(records);
    expect(groups).toHaveLength(1);
    expect(groups[0].sy).toBe("2025–2026");
    expect(groups[0].total).toBe(165);
  });

  it("does not enumerate a month that only has a Session and no HourRecord (by design — see serviceYearAggregation)", () => {
    const records = [record(2025, 9, 60)];
    const sessions = [session("2025-10-05", 120)]; // a session-only month
    const groups = groupBySY(records, sessions);
    expect(groups[0].records).toHaveLength(1);
    expect(groups[0].records[0].month).toBe(9);
  });

  it("prefers Session totals over the raw record.hours sum when a grouped month has Session data", () => {
    const records = [record(2025, 9, 60)];
    const sessions = [session("2025-09-01", 600)]; // 10h, supersedes the 60h record
    const groups = groupBySY(records, sessions);
    expect(groups[0].total).toBe(10);
  });
});

describe("serviceYearAggregation (unified, session-aware)", () => {
  it("enumerates the union of months from both HourRecord and Session", () => {
    const records = [record(2025, 9, 60)];
    const sessions = [session("2025-10-05", 120)]; // 2h, session-only month
    const [group] = serviceYearAggregation(records, sessions);
    expect(group.months.map((m) => `${m.year}-${m.month}`)).toEqual([
      "2025-9",
      "2025-10",
    ]);
  });

  it("labels each month's source correctly and never blends the two", () => {
    const records = [record(2025, 9, 60)];
    const sessions = [session("2025-10-05", 120)];
    const [group] = serviceYearAggregation(records, sessions);
    const sep = group.months.find((m) => m.month === 9)!;
    const oct = group.months.find((m) => m.month === 10)!;
    expect(sep.source).toBe("legacy");
    expect(sep.hours).toBe(60);
    expect(oct.source).toBe("session");
    expect(oct.hours).toBe(2);
  });

  it("groups months into service years the same way groupBySY does (Sept–Aug, ascending)", () => {
    const records = [record(2025, 8, 10), record(2025, 9, 20)];
    const groups = serviceYearAggregation(records, []);
    expect(groups.map((g) => g.sy)).toEqual(["2024–2025", "2025–2026"]);
  });

  it("sums each service year's total from its resolved months", () => {
    const records = [record(2025, 9, 60), record(2025, 11, 40)];
    const sessions = [session("2025-10-05", 120)]; // +2h, session-only month
    const [group] = serviceYearAggregation(records, sessions);
    expect(group.total).toBe(60 + 2 + 40);
  });

  it("sorts months within a service year ascending by year/month", () => {
    const records = [record(2025, 11, 5), record(2025, 9, 5)];
    const sessions = [session("2025-10-01", 60)];
    const [group] = serviceYearAggregation(records, sessions);
    expect(group.months.map((m) => m.month)).toEqual([9, 10, 11]);
  });
});

// TASK_005B — Product Rule: the legacy HourRecord entry workflow must
// refuse to save for the current month, any future month, or any past
// month with >=1 Session; past months with zero Sessions stay editable.
// See docs/TASKS/TASK_005_ARCHITECTURE.md §10 (resolved: "blocked, not
// warned") and RecordForm's UI-integration tests for the save-time check.
describe("legacyEntryBlockReason", () => {
  const now = new Date(2026, 5, 15); // June 2026

  it("blocks the current calendar month", () => {
    expect(legacyEntryBlockReason([], 2026, 6, now)).toBe("current");
  });

  it("blocks a future month in the same year", () => {
    expect(legacyEntryBlockReason([], 2026, 7, now)).toBe("future");
  });

  it("blocks a future year entirely", () => {
    expect(legacyEntryBlockReason([], 2027, 1, now)).toBe("future");
  });

  it("blocks a past month that already has at least one Session", () => {
    const sessions = [session("2026-03-10", 60)];
    expect(legacyEntryBlockReason(sessions, 2026, 3, now)).toBe("session");
  });

  it("allows a past month with zero Sessions (legitimate historical backfill)", () => {
    expect(legacyEntryBlockReason([], 2026, 3, now)).toBeNull();
  });

  it("does not let an unrelated Session in a different month block this one", () => {
    const sessions = [session("2026-04-10", 60)];
    expect(legacyEntryBlockReason(sessions, 2026, 3, now)).toBeNull();
  });
});

// TASK_005B DoD: explicitly verify that after creating one Session for the
// current month, Home (via serviceYearAggregation/hoursForMonth) reflects
// it, while the Hours screen's frozen contract — groupBySY(records) with
// no sessions argument, its actual TASK_005A-era call site — does not.
// This divergence is expected until TASK_005D migrates the Hours screen.
describe("TASK_005B workflow: current-month Session vs. the frozen Hours contract", () => {
  it("serviceYearAggregation marks the current month Session-authoritative while groupBySY(records) ignores it", () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const records = [record(year, month, 10)]; // legacy total, would otherwise show 10h
    const sessions = [session(`${year}-${String(month).padStart(2, "0")}-01`, 120)]; // 2h Session

    const [group] = serviceYearAggregation(records, sessions).slice(-1);
    const current = group.months.find((m) => m.year === year && m.month === month)!;
    expect(current.source).toBe("session");
    expect(current.hours).toBe(2);
    expect(hoursForMonth(records, now, sessions)).toBe(2);

    // Hours screen's actual call site: groupBySY(records) — no sessions
    // argument — must still resolve from the legacy record, unaffected.
    const legacyGroups = groupBySY(records);
    const legacySy = legacyGroups.find((g) => g.records.some((r) => r.year === year && r.month === month))!;
    expect(legacySy.total).toBe(10);
  });
});
