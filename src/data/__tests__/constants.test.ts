import { formatHMRounded, roundDurationToNearestFive } from "@/data/constants";

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
