import { act, create } from "react-test-renderer";
import { Text } from "react-native";
import { MonthCalendarModal } from "@/components/forms/MonthCalendarModal";

jest.setTimeout(30000);

function pressables(root: ReturnType<typeof create>["root"]) {
  return root.findAll((n) => (n.type as any)?.displayName === "Pressable" || (n.type as any)?.name === "Pressable");
}

function byLabel(root: ReturnType<typeof create>["root"], label: string) {
  return pressables(root).find((n) => n.props.accessibilityLabel === label);
}

function texts(root: ReturnType<typeof create>["root"]) {
  return root.findAllByType(Text).map((n) => n.props.children);
}

describe("MonthCalendarModal", () => {
  it("renders nothing when not visible", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <MonthCalendarModal visible={false} selectedDate="2026-07-19" onSelect={jest.fn()} onClose={jest.fn()} />,
      );
    });
    expect(byLabel(renderer.root, "Предыдущий месяц")).toBeUndefined();
  });

  it("shows the Russian month name and year for the selected date's month", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <MonthCalendarModal visible={true} selectedDate="2026-07-19" onSelect={jest.fn()} onClose={jest.fn()} />,
      );
    });
    const flat = texts(renderer.root).flat();
    expect(flat.join(" ")).toContain("Июль");
    expect(flat.join(" ")).toContain("2026");
  });

  it("renders Monday-first weekday header abbreviations", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <MonthCalendarModal visible={true} selectedDate="2026-07-19" onSelect={jest.fn()} onClose={jest.fn()} />,
      );
    });
    expect(texts(renderer.root)).toEqual(
      expect.arrayContaining(["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]),
    );
  });

  it("navigates to the next month via the arrow button, with accessible label", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <MonthCalendarModal visible={true} selectedDate="2026-07-19" onSelect={jest.fn()} onClose={jest.fn()} />,
      );
    });
    act(() => {
      byLabel(renderer.root, "Следующий месяц")?.props.onPress();
    });
    const flat = texts(renderer.root).flat().join(" ");
    expect(flat).toContain("Август");
  });

  it("navigates to the previous month via the arrow button, crossing a year boundary", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <MonthCalendarModal visible={true} selectedDate="2026-01-15" onSelect={jest.fn()} onClose={jest.fn()} />,
      );
    });
    act(() => {
      byLabel(renderer.root, "Предыдущий месяц")?.props.onPress();
    });
    const flat = texts(renderer.root).flat().join(" ");
    expect(flat).toContain("Декабрь");
    expect(flat).toContain("2025");
  });

  it("calls onSelect with the correct ISO date when a day is pressed", () => {
    const onSelect = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <MonthCalendarModal visible={true} selectedDate="2026-07-19" onSelect={onSelect} onClose={jest.fn()} />,
      );
    });
    act(() => {
      byLabel(renderer.root, "25 Июль 2026")?.props.onPress();
    });
    expect(onSelect).toHaveBeenCalledWith("2026-07-25");
  });

  it("calls onSelect with a correctly zero-padded ISO date for single-digit months/days", () => {
    const onSelect = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <MonthCalendarModal visible={true} selectedDate="2026-03-01" onSelect={onSelect} onClose={jest.fn()} />,
      );
    });
    act(() => {
      byLabel(renderer.root, "5 Март 2026")?.props.onPress();
    });
    expect(onSelect).toHaveBeenCalledWith("2026-03-05");
  });

  it("re-centers on the selected date's month each time it opens", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <MonthCalendarModal visible={false} selectedDate="2026-07-19" onSelect={jest.fn()} onClose={jest.fn()} />,
      );
    });
    act(() => {
      renderer.update(
        <MonthCalendarModal visible={true} selectedDate="2026-07-19" onSelect={jest.fn()} onClose={jest.fn()} />,
      );
    });
    expect(texts(renderer.root).flat().join(" ")).toContain("Июль");
  });
});
