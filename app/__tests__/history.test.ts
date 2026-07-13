// Unit tests for the History screen's grouping logic (TASK_005B).
import { buildHistory } from "../history";
import type { HourRecord, Session } from "@/types";

function record(year: number, month: number, hours: number, id = `r-${year}-${month}`): HourRecord {
  return { id, year, month, hours, note: "" };
}

function session(date: string, durationMinutes: number, id = `s-${date}`): Session {
  return { id, date, durationMinutes, source: "manual", note: "", createdAt: date, updatedAt: date };
}

describe("buildHistory", () => {
  it("groups service years in reverse-chronological order", () => {
    const records = [record(2024, 9, 10), record(2025, 9, 20)];
    const groups = buildHistory(records, []);
    expect(groups.map((g) => g.sy)).toEqual(["2025–2026", "2024–2025"]);
  });

  it("sorts months within a service year in reverse-chronological order", () => {
    const records = [record(2025, 9, 10), record(2025, 11, 20)];
    const [group] = buildHistory(records, []);
    expect(group.months.map((m) => m.month)).toEqual([11, 9]);
  });

  it("produces one row per Session for a month that has Sessions, sorted newest first", () => {
    const sessions = [session("2026-06-01", 60), session("2026-06-15", 30)];
    const groups = buildHistory([], sessions);
    const month = groups[0].months[0];
    expect(month.rows).toHaveLength(2);
    expect(month.rows.map((r) => (r.kind === "session" ? r.session.date : null))).toEqual([
      "2026-06-15",
      "2026-06-01",
    ]);
  });

  it("produces one collapsed legacy row for a month with a HourRecord and zero Sessions", () => {
    const records = [record(2025, 9, 44)];
    const groups = buildHistory(records, []);
    const month = groups[0].months[0];
    expect(month.rows).toEqual([{ kind: "legacy", hours: 44 }]);
  });

  it("prefers Session rows over the legacy row when both exist for the same month", () => {
    const records = [record(2025, 9, 44)];
    const sessions = [session("2025-09-05", 60)];
    const groups = buildHistory(records, sessions);
    const month = groups[0].months[0];
    expect(month.rows).toEqual([{ kind: "session", session: sessions[0] }]);
  });

  it("includes a month present only via Session (no HourRecord)", () => {
    const sessions = [session("2025-10-05", 60)];
    const groups = buildHistory([], sessions);
    expect(groups[0].months.map((m) => m.month)).toEqual([10]);
  });
});
