// Pure unit test for the Home header's date formatter (TASK_014):
// "Пятница, 17 июля" — capitalized weekday first, then day + genitive month.
import { formatHomeDate } from "../(tabs)/index";

describe("formatHomeDate", () => {
  it("formats a Friday in July with a capitalized weekday leading", () => {
    // 2026-07-17 is a Friday.
    expect(formatHomeDate(new Date(2026, 6, 17))).toBe("Пятница, 17 июля");
  });

  it("formats a Monday in January with the correct genitive month", () => {
    // 2026-01-05 is a Monday.
    expect(formatHomeDate(new Date(2026, 0, 5))).toBe("Понедельник, 5 января");
  });
});
