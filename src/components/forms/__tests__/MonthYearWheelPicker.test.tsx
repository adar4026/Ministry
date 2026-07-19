import { act, create } from "react-test-renderer";
import { WheelPicker } from "@/components/WheelPicker";
import { MonthYearWheelPicker } from "@/components/forms/MonthYearWheelPicker";

jest.setTimeout(30000);

function wheels(root: ReturnType<typeof create>["root"]) {
  const all = root.findAllByType(WheelPicker);
  return { month: all[0], year: all[1] };
}

describe("MonthYearWheelPicker", () => {
  it("renders the month wheel with all 12 Russian month names, centered on the given month", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <MonthYearWheelPicker monthIndex0={6} year={2026} onChangeMonth={jest.fn()} onChangeYear={jest.fn()} />,
      );
    });
    const { month } = wheels(renderer.root);
    const labels = month.props.items.map((item: { label: string }) => item.label);
    expect(labels).toEqual([
      "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
      "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
    ]);
    expect(month.props.value).toBe(6);
  });

  it("renders the year wheel centered on the given year, spanning several decades", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <MonthYearWheelPicker monthIndex0={0} year={2026} onChangeMonth={jest.fn()} onChangeYear={jest.fn()} />,
      );
    });
    const { year } = wheels(renderer.root);
    expect(year.props.value).toBe(2026);
    const values = year.props.items.map((item: { value: number }) => item.value);
    expect(values).toContain(2026);
    expect(Math.min(...values)).toBeLessThanOrEqual(2026 - 40);
    expect(Math.max(...values)).toBeGreaterThanOrEqual(2026 + 10);
  });

  it("always includes a year far outside the default decades-wide range (e.g. after ‹/› navigation before opening the picker)", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <MonthYearWheelPicker monthIndex0={0} year={1950} onChangeMonth={jest.fn()} onChangeYear={jest.fn()} />,
      );
    });
    const { year } = wheels(renderer.root);
    const values = year.props.items.map((item: { value: number }) => item.value);
    expect(values).toContain(1950);
  });

  it("reports the selected month via onChangeMonth", () => {
    const onChangeMonth = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <MonthYearWheelPicker monthIndex0={0} year={2026} onChangeMonth={onChangeMonth} onChangeYear={jest.fn()} />,
      );
    });
    act(() => {
      wheels(renderer.root).month.props.onChange(8); // Сентябрь
    });
    expect(onChangeMonth).toHaveBeenCalledWith(8);
  });

  it("reports the selected year via onChangeYear", () => {
    const onChangeYear = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <MonthYearWheelPicker monthIndex0={0} year={2026} onChangeMonth={jest.fn()} onChangeYear={onChangeYear} />,
      );
    });
    act(() => {
      wheels(renderer.root).year.props.onChange(2031);
    });
    expect(onChangeYear).toHaveBeenCalledWith(2031);
  });
});
