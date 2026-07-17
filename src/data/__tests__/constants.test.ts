import { roundDurationToNearestFive } from "@/data/constants";

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
