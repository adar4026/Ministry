// Unit tests for TASK_015 pace-status helpers (Home monthly card).
// Pure functions — no React, no StoreContext, no RN needed.
//
// buildCumulativeSeries() and its day-by-day cumulative-series tests were
// removed along with the rejected cumulative-line-chart direction — see
// docs/TASKS/TASK_015_HOME_MONTHLY_PACE_STATUS.md. Only idealCumulativeHours/
// computePaceDeviation/formatDeviationLabel remain, since those are what the
// approved bar + pace-status-label design actually uses.
import { computePaceDeviation, formatDeviationLabel, idealCumulativeHours } from "../cumulativeProgress";

describe("idealCumulativeHours", () => {
  it("is linear across the month", () => {
    expect(idealCumulativeHours(50, 31, 0)).toBe(0);
    expect(idealCumulativeHours(50, 31, 31)).toBe(50);
    expect(idealCumulativeHours(50, 31, 16)).toBeCloseTo((50 * 16) / 31, 5);
  });

  it("handles the first day of the month", () => {
    expect(idealCumulativeHours(50, 31, 1)).toBeCloseTo(50 / 31, 5);
  });

  it("handles the last day of the month (reaches exactly the goal)", () => {
    expect(idealCumulativeHours(50, 31, 31)).toBe(50);
  });

  it("is correct across 28/29/30/31-day months", () => {
    expect(idealCumulativeHours(28, 28, 28)).toBe(28);
    expect(idealCumulativeHours(29, 29, 29)).toBe(29);
    expect(idealCumulativeHours(30, 30, 30)).toBe(30);
    expect(idealCumulativeHours(50, 30, 15)).toBeCloseTo(25, 5);
  });

  it("clamps day into [0, daysInMonth]", () => {
    expect(idealCumulativeHours(50, 31, -5)).toBe(0);
    expect(idealCumulativeHours(50, 31, 999)).toBe(50);
  });

  it("returns 0 for a zero or negative goal without dividing by zero", () => {
    expect(idealCumulativeHours(0, 31, 16)).toBe(0);
    expect(idealCumulativeHours(-10, 31, 16)).toBe(0);
    expect(Number.isFinite(idealCumulativeHours(0, 31, 16))).toBe(true);
  });

  it("returns 0 for a zero or negative daysInMonth without dividing by zero", () => {
    expect(idealCumulativeHours(50, 0, 16)).toBe(0);
    expect(Number.isFinite(idealCumulativeHours(50, 0, 16))).toBe(true);
  });
});

describe("computePaceDeviation", () => {
  it("detects ahead-of-plan", () => {
    // day 16 of 31, goal 50 -> ideal ~25.8h; 38h done is well ahead
    const d = computePaceDeviation(38, 50, 31, 16);
    expect(d.status).toBe("ahead");
    expect(d.deviationHours).toBeGreaterThan(0);
  });

  it("detects behind-of-plan", () => {
    const d = computePaceDeviation(10, 50, 31, 16);
    expect(d.status).toBe("behind");
    expect(d.deviationHours).toBeLessThan(0);
  });

  it("detects exactly-on-plan within the float-noise epsilon", () => {
    const ideal = idealCumulativeHours(50, 31, 16);
    const d = computePaceDeviation(ideal, 50, 31, 16);
    expect(d.status).toBe("on");
    expect(Math.abs(d.deviationHours)).toBeLessThan(1 / 60);
  });

  it("handles a zero goal without crashing (no ideal pace to compare against)", () => {
    const d = computePaceDeviation(10, 0, 31, 16);
    expect(Number.isFinite(d.deviationHours)).toBe(true);
    expect(["ahead", "behind", "on"]).toContain(d.status);
  });

  it("handles a completed and over-completed goal", () => {
    const completed = computePaceDeviation(50, 50, 31, 31);
    expect(completed.status).toBe("on");
    const overCompleted = computePaceDeviation(65, 50, 31, 20);
    expect(overCompleted.status).toBe("ahead");
    expect(overCompleted.deviationHours).toBeGreaterThan(0);
  });

  it("handles the first day of the month (day 1)", () => {
    const d = computePaceDeviation(0, 50, 31, 1);
    expect(d.status).toBe("behind");
    expect(Number.isFinite(d.deviationHours)).toBe(true);
  });

  it("handles the last day of the month (day == daysInMonth)", () => {
    const onPace = computePaceDeviation(50, 50, 31, 31);
    expect(onPace.status).toBe("on");
    const behind = computePaceDeviation(40, 50, 31, 31);
    expect(behind.status).toBe("behind");
  });

  it("is correct across 28/29/30/31-day months", () => {
    expect(computePaceDeviation(28, 28, 28, 28).status).toBe("on");
    expect(computePaceDeviation(29, 29, 29, 29).status).toBe("on");
    expect(computePaceDeviation(30, 30, 30, 30).status).toBe("on");
    expect(computePaceDeviation(50, 50, 31, 31).status).toBe("on");
  });

  it("is defensive against non-finite inputs (never throws, never returns NaN status)", () => {
    const d = computePaceDeviation(NaN, 50, 31, 16);
    expect(["ahead", "behind", "on"]).toContain(d.status);
  });
});

describe("formatDeviationLabel", () => {
  it("formats an ahead label with hours and minutes", () => {
    expect(formatDeviationLabel({ deviationHours: 12 + 10 / 60, status: "ahead" })).toBe("Опережение на 12 ч 10 м");
  });

  it("formats a behind label using the absolute value (no minus sign)", () => {
    const label = formatDeviationLabel({ deviationHours: -(3 + 5 / 60), status: "behind" });
    expect(label).toBe("Отставание на 3 ч 5 м");
    expect(label).not.toContain("-");
  });

  it("formats a neutral on-pace message", () => {
    expect(formatDeviationLabel({ deviationHours: 0, status: "on" })).toBe("Точно по плану");
  });
});
