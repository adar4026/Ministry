// TASK_059 — reminder scheduling logic.
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  REMINDER_TIMES,
  diffReminders,
  planReminders,
  reminderBody,
  reminderFireAt,
  reminderId,
  reminderTitle,
  type ScheduledReminder,
} from "../notifications";
import type { MinistryEvent, NotificationSettings } from "@/types";

const ALL_ON: NotificationSettings = { enabled: true, dayBefore: true, sameDay: true };

function ev(id: string, date: string, title = "Конгресс"): MinistryEvent {
  return { id, date, title, category: "other" };
}

// Local-time helper — every assertion below is about the DEVICE's wall clock,
// never UTC, so the expectations are built the same way the code is.
function local(y: number, m: number, d: number, h = 0, min = 0): Date {
  return new Date(y, m - 1, d, h, min, 0, 0);
}

describe("reminderFireAt — TASK_059", () => {
  it("fires the day-before reminder at 19:00 on the previous day", () => {
    const at = reminderFireAt("2026-09-15", "dayBefore")!;
    expect(at.getFullYear()).toBe(2026);
    expect(at.getMonth()).toBe(8); // September
    expect(at.getDate()).toBe(14);
    expect(at.getHours()).toBe(19);
    expect(at.getMinutes()).toBe(0);
  });

  it("fires the same-day reminder at 09:00 on the event's own day", () => {
    const at = reminderFireAt("2026-09-15", "sameDay")!;
    expect(at.getDate()).toBe(15);
    expect(at.getMonth()).toBe(8);
    expect(at.getHours()).toBe(9);
    expect(at.getMinutes()).toBe(0);
  });

  it("uses the documented default times", () => {
    expect(REMINDER_TIMES.dayBefore).toEqual({ hour: 19, minute: 0 });
    expect(REMINDER_TIMES.sameDay).toEqual({ hour: 9, minute: 0 });
  });

  it("rolls the day-before reminder back across a month boundary", () => {
    const at = reminderFireAt("2026-03-01", "dayBefore")!;
    expect(at.getMonth()).toBe(1); // February
    expect(at.getDate()).toBe(28);
    expect(at.getHours()).toBe(19);
  });

  it("rolls the day-before reminder back across a year boundary", () => {
    const at = reminderFireAt("2027-01-01", "dayBefore")!;
    expect(at.getFullYear()).toBe(2026);
    expect(at.getMonth()).toBe(11); // December
    expect(at.getDate()).toBe(31);
  });

  it("handles a leap day correctly", () => {
    const at = reminderFireAt("2028-03-01", "dayBefore")!;
    expect(at.getMonth()).toBe(1);
    expect(at.getDate()).toBe(29); // 2028 is a leap year
  });

  it("returns null for calendar-impossible and malformed dates", () => {
    expect(reminderFireAt("2026-02-31", "sameDay")).toBeNull();
    expect(reminderFireAt("2026-13-01", "sameDay")).toBeNull();
    expect(reminderFireAt("не дата", "sameDay")).toBeNull();
    expect(reminderFireAt("", "dayBefore")).toBeNull();
    expect(reminderFireAt("2026-9-15", "sameDay")).toBeNull();
  });
});

describe("reminder texts — TASK_059", () => {
  it("uses the agreed Russian titles", () => {
    expect(reminderTitle("dayBefore")).toBe("Завтра событие");
    expect(reminderTitle("sameDay")).toBe("Сегодня событие");
  });

  it("wraps the event name in guillemets", () => {
    expect(reminderBody("Конгресс")).toBe("«Конгресс»");
    expect(reminderBody("  Встреча  ")).toBe("«Встреча»");
  });

  it("falls back for a blank title instead of rendering empty quotes", () => {
    expect(reminderBody("   ")).toBe("«Событие»");
  });
});

describe("planReminders — switches", () => {
  const now = local(2026, 9, 1, 12);

  it("returns nothing while the master switch is off", () => {
    expect(planReminders([ev("e1", "2026-09-15")], DEFAULT_NOTIFICATION_SETTINGS, now)).toEqual([]);
    expect(planReminders([ev("e1", "2026-09-15")], { enabled: false, dayBefore: true, sameDay: true }, now)).toEqual([]);
  });

  it("defaults to off, with both kinds pre-selected", () => {
    expect(DEFAULT_NOTIFICATION_SETTINGS).toEqual({ enabled: false, dayBefore: true, sameDay: true });
  });

  it("schedules both kinds when both are on", () => {
    const plan = planReminders([ev("e1", "2026-09-15")], ALL_ON, now);
    expect(plan.map((r) => r.kind)).toEqual(["dayBefore", "sameDay"]);
  });

  it("schedules only the day-before reminder when same-day is off", () => {
    const plan = planReminders([ev("e1", "2026-09-15")], { enabled: true, dayBefore: true, sameDay: false }, now);
    expect(plan).toHaveLength(1);
    expect(plan[0].kind).toBe("dayBefore");
    expect(plan[0].title).toBe("Завтра событие");
  });

  it("schedules only the same-day reminder when day-before is off", () => {
    const plan = planReminders([ev("e1", "2026-09-15")], { enabled: true, dayBefore: false, sameDay: true }, now);
    expect(plan).toHaveLength(1);
    expect(plan[0].kind).toBe("sameDay");
    expect(plan[0].title).toBe("Сегодня событие");
  });

  it("returns nothing when both kinds are off even with the master switch on", () => {
    expect(planReminders([ev("e1", "2026-09-15")], { enabled: true, dayBefore: false, sameDay: false }, now)).toEqual(
      [],
    );
  });
});

describe("planReminders — past events are never scheduled", () => {
  it("drops an event whose date is in the past", () => {
    const now = local(2026, 9, 20, 12);
    expect(planReminders([ev("e1", "2026-09-15")], ALL_ON, now)).toEqual([]);
  });

  it("drops the 09:00 slot once it has passed today, keeping nothing else for today", () => {
    const now = local(2026, 9, 15, 10); // 10:00 on the event's own day
    expect(planReminders([ev("e1", "2026-09-15")], ALL_ON, now)).toEqual([]);
  });

  it("keeps today's 09:00 slot when it is still ahead", () => {
    const now = local(2026, 9, 15, 8);
    const plan = planReminders([ev("e1", "2026-09-15")], ALL_ON, now);
    expect(plan.map((r) => r.kind)).toEqual(["sameDay"]);
  });

  it("drops a reminder whose fire time is exactly now, keeps one a minute later", () => {
    const exactly = local(2026, 9, 14, 19); // dayBefore slot for 2026-09-15
    expect(planReminders([ev("e1", "2026-09-15")], { enabled: true, dayBefore: true, sameDay: false }, exactly)).toEqual(
      [],
    );
    const aMinuteBefore = local(2026, 9, 14, 18, 59);
    expect(
      planReminders([ev("e1", "2026-09-15")], { enabled: true, dayBefore: true, sameDay: false }, aMinuteBefore),
    ).toHaveLength(1);
  });

  it("keeps the same-day reminder of an event whose day-before slot already passed", () => {
    const now = local(2026, 9, 14, 20); // after 19:00 the evening before
    const plan = planReminders([ev("e1", "2026-09-15")], ALL_ON, now);
    expect(plan.map((r) => r.kind)).toEqual(["sameDay"]);
  });

  it("skips events with unusable dates without dropping the valid ones", () => {
    const now = local(2026, 9, 1, 12);
    const plan = planReminders([ev("bad", "2026-02-31"), ev("good", "2026-09-15")], ALL_ON, now);
    expect(plan.every((r) => r.eventId === "good")).toBe(true);
    expect(plan).toHaveLength(2);
  });
});

describe("planReminders — no duplicates", () => {
  const now = local(2026, 9, 1, 12);

  it("uses a deterministic id per event and kind", () => {
    const plan = planReminders([ev("e1", "2026-09-15")], ALL_ON, now);
    expect(plan.map((r) => r.id)).toEqual([reminderId("e1", "dayBefore"), reminderId("e1", "sameDay")]);
  });

  it("produces an identical plan when called repeatedly", () => {
    const events = [ev("e1", "2026-09-15"), ev("e2", "2026-10-02", "Собрание")];
    const first = planReminders(events, ALL_ON, now);
    const second = planReminders(events, ALL_ON, now);
    expect(second).toEqual(first);
    expect(new Set(first.map((r) => r.id)).size).toBe(first.length);
  });

  it("collapses duplicate event ids into a single reminder per kind", () => {
    const plan = planReminders([ev("e1", "2026-09-15"), ev("e1", "2026-09-15")], ALL_ON, now);
    expect(plan).toHaveLength(2);
    expect(new Set(plan.map((r) => r.id)).size).toBe(2);
  });

  it("toggling a kind off and back on returns the exact same reminder set", () => {
    const events = [ev("e1", "2026-09-15")];
    const before = planReminders(events, ALL_ON, now);
    planReminders(events, { enabled: true, dayBefore: false, sameDay: true }, now);
    const after = planReminders(events, ALL_ON, now);
    expect(after).toEqual(before);
  });

  it("sorts by fire time", () => {
    const plan = planReminders([ev("late", "2026-10-02"), ev("early", "2026-09-15")], ALL_ON, now);
    const times = plan.map((r) => r.fireAt);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("carries the event's title and date onto every reminder", () => {
    const plan = planReminders([ev("e1", "2026-09-15", "Областной конгресс")], ALL_ON, now);
    expect(plan[0].eventTitle).toBe("Областной конгресс");
    expect(plan[0].eventDate).toBe("2026-09-15");
    expect(plan[0].body).toBe("«Областной конгресс»");
  });
});

describe("diffReminders — TASK_059", () => {
  const now = local(2026, 9, 1, 12);
  const events = [ev("e1", "2026-09-15"), ev("e2", "2026-10-02", "Собрание")];
  const current = planReminders(events, ALL_ON, now);

  it("reports nothing to do when nothing changed", () => {
    const diff = diffReminders(current, planReminders(events, ALL_ON, now));
    expect(diff.add).toEqual([]);
    expect(diff.remove).toEqual([]);
    expect(diff.unchanged).toHaveLength(current.length);
  });

  it("cancels both reminders of a deleted event and touches nothing else", () => {
    const next = planReminders([events[1]], ALL_ON, now);
    const diff = diffReminders(current, next);
    expect(diff.add).toEqual([]);
    expect(diff.remove.sort()).toEqual([reminderId("e1", "dayBefore"), reminderId("e1", "sameDay")].sort());
    expect(diff.unchanged.map((r) => r.eventId)).toEqual(["e2", "e2"]);
  });

  it("cancels everything when the master switch is turned off", () => {
    const diff = diffReminders(current, planReminders(events, { ...ALL_ON, enabled: false }, now));
    expect(diff.add).toEqual([]);
    expect(diff.remove).toHaveLength(current.length);
  });

  it("cancels only the disabled kind when one switch is turned off", () => {
    const next = planReminders(events, { enabled: true, dayBefore: false, sameDay: true }, now);
    const diff = diffReminders(current, next);
    expect(diff.add).toEqual([]);
    expect(diff.remove.every((id) => id.endsWith("::dayBefore"))).toBe(true);
    expect(diff.remove).toHaveLength(2);
  });

  it("re-schedules a reminder when the event date is edited (cancel old + create new)", () => {
    const next = planReminders([ev("e1", "2026-09-20"), events[1]], ALL_ON, now);
    const diff = diffReminders(current, next);
    const changed = [reminderId("e1", "dayBefore"), reminderId("e1", "sameDay")];
    expect(diff.remove.sort()).toEqual(changed.sort());
    expect(diff.add.map((r) => r.id).sort()).toEqual(changed.sort());
    // Same ids, new fire times — that is exactly "cancel the old, create the new".
    expect(diff.add.every((r) => r.fireAt !== current.find((c) => c.id === r.id)!.fireAt)).toBe(true);
  });

  it("re-schedules a reminder when only the event title is edited", () => {
    const next = planReminders([ev("e1", "2026-09-15", "Новое название"), events[1]], ALL_ON, now);
    const diff = diffReminders(current, next);
    expect(diff.add.map((r) => r.body)).toEqual(["«Новое название»", "«Новое название»"]);
    expect(diff.remove).toHaveLength(2);
    expect(diff.unchanged.map((r) => r.eventId)).toEqual(["e2", "e2"]);
  });

  it("schedules both reminders for a newly created event", () => {
    const next = planReminders([...events, ev("e3", "2026-11-05", "Новое")], ALL_ON, now);
    const diff = diffReminders(current, next);
    expect(diff.remove).toEqual([]);
    expect(diff.add.map((r) => r.id).sort()).toEqual(
      [reminderId("e3", "dayBefore"), reminderId("e3", "sameDay")].sort(),
    );
  });

  it("is a no-op against an empty current set beyond the additions themselves", () => {
    const diff = diffReminders([], current);
    expect(diff.remove).toEqual([]);
    expect(diff.add).toHaveLength(current.length);
    expect(diff.unchanged).toEqual([]);
  });

  it("cancels a reminder that has since fallen into the past", () => {
    const later = planReminders(events, ALL_ON, local(2026, 9, 16, 12));
    const diff: { remove: string[] } = diffReminders(current, later);
    expect(diff.remove.sort()).toEqual([reminderId("e1", "dayBefore"), reminderId("e1", "sameDay")].sort());
  });

  it("treats an unrelated field difference on the same id as unchanged", () => {
    const stale: ScheduledReminder[] = current.map((r) => ({ ...r, eventTitle: "старое значение" }));
    const diff = diffReminders(stale, current);
    expect(diff.add).toEqual([]);
    expect(diff.remove).toEqual([]);
  });
});
