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

  // TASK_030 follow-up §8/§9: tapping the "Июль 2026 ▾" header opens a
  // month/year quick-picker instead of navigating the day grid directly.
  describe("month/year picker (chevron)", () => {
    function header(root: ReturnType<typeof create>["root"]) {
      return byLabel(root, "Выбрать месяц и год");
    }

    it("shows a chevron next to the month/year header", () => {
      let renderer!: ReturnType<typeof create>;
      act(() => {
        renderer = create(
          <MonthCalendarModal visible={true} selectedDate="2026-07-19" onSelect={jest.fn()} onClose={jest.fn()} />,
        );
      });
      expect(texts(renderer.root).flat()).toContain("▾");
      expect(header(renderer.root)).toBeTruthy();
      expect(header(renderer.root)?.props.accessibilityState).toEqual({ expanded: false });
    });

    it("opens the month/year picker on press, flips the chevron, and hides the day grid", () => {
      let renderer!: ReturnType<typeof create>;
      act(() => {
        renderer = create(
          <MonthCalendarModal visible={true} selectedDate="2026-07-19" onSelect={jest.fn()} onClose={jest.fn()} />,
        );
      });
      act(() => {
        header(renderer.root)?.props.onPress();
      });
      expect(header(renderer.root)?.props.accessibilityState).toEqual({ expanded: true });
      expect(texts(renderer.root).flat()).toContain("▴");
      // Weekday header ("Пн") is only rendered in day-grid mode.
      expect(texts(renderer.root)).not.toEqual(expect.arrayContaining(["Пн"]));
      // The month/year wheels render both Russian months and years as rows.
      expect(texts(renderer.root).flat().join(" ")).toContain("Июль");
      expect(texts(renderer.root).flat().join(" ")).toContain("2026");
    });

    it("closes the month/year picker on a second press, returning to the day grid", () => {
      let renderer!: ReturnType<typeof create>;
      act(() => {
        renderer = create(
          <MonthCalendarModal visible={true} selectedDate="2026-07-19" onSelect={jest.fn()} onClose={jest.fn()} />,
        );
      });
      act(() => {
        header(renderer.root)?.props.onPress();
      });
      act(() => {
        header(renderer.root)?.props.onPress();
      });
      expect(header(renderer.root)?.props.accessibilityState).toEqual({ expanded: false });
      expect(texts(renderer.root)).toEqual(expect.arrayContaining(["Пн"]));
    });

    it("changing the month in the wheel updates the displayed month, without touching selectedDate until a day is picked", () => {
      const onSelect = jest.fn();
      let renderer!: ReturnType<typeof create>;
      act(() => {
        renderer = create(
          <MonthCalendarModal visible={true} selectedDate="2026-07-19" onSelect={onSelect} onClose={jest.fn()} />,
        );
      });
      act(() => {
        header(renderer.root)?.props.onPress();
      });
      const monthWheel = renderer.root.findAllByProps({ accessibilityLabel: "Месяц" })[0];
      act(() => {
        monthWheel.props.onChange(1); // Февраль
      });
      expect(onSelect).not.toHaveBeenCalled();
      act(() => {
        header(renderer.root)?.props.onPress(); // back to grid
      });
      expect(texts(renderer.root).flat().join(" ")).toContain("Февраль");
      // 31 July -> February: the grid must show a real February day (no
      // silent 31 -> 28 normalization) since selectedDate hasn't changed yet.
      expect(byLabel(renderer.root, "28 Февраль 2026")).toBeTruthy();
    });

    it("changing the year in the wheel updates the displayed year without changing selectedDate", () => {
      const onSelect = jest.fn();
      let renderer!: ReturnType<typeof create>;
      act(() => {
        renderer = create(
          <MonthCalendarModal visible={true} selectedDate="2026-07-19" onSelect={onSelect} onClose={jest.fn()} />,
        );
      });
      act(() => {
        header(renderer.root)?.props.onPress();
      });
      const yearWheel = renderer.root.findAllByProps({ accessibilityLabel: "Год" })[0];
      act(() => {
        yearWheel.props.onChange(2030);
      });
      expect(onSelect).not.toHaveBeenCalled();
      act(() => {
        header(renderer.root)?.props.onPress();
      });
      expect(texts(renderer.root).flat().join(" ")).toContain("2030");
    });

    it("always reopens on the day grid, even if the previous session left the month/year picker open", () => {
      let renderer!: ReturnType<typeof create>;
      act(() => {
        renderer = create(
          <MonthCalendarModal visible={true} selectedDate="2026-07-19" onSelect={jest.fn()} onClose={jest.fn()} />,
        );
      });
      act(() => {
        header(renderer.root)?.props.onPress();
      });
      expect(header(renderer.root)?.props.accessibilityState).toEqual({ expanded: true });
      act(() => {
        renderer.update(
          <MonthCalendarModal visible={false} selectedDate="2026-07-19" onSelect={jest.fn()} onClose={jest.fn()} />,
        );
      });
      act(() => {
        renderer.update(
          <MonthCalendarModal visible={true} selectedDate="2026-07-19" onSelect={jest.fn()} onClose={jest.fn()} />,
        );
      });
      expect(header(renderer.root)?.props.accessibilityState).toEqual({ expanded: false });
      expect(texts(renderer.root)).toEqual(expect.arrayContaining(["Пн"]));
    });

    it("December -> January and January -> December month-wheel transitions don't shift the year on their own (day-grid nav unaffected)", () => {
      let renderer!: ReturnType<typeof create>;
      act(() => {
        renderer = create(
          <MonthCalendarModal visible={true} selectedDate="2026-01-15" onSelect={jest.fn()} onClose={jest.fn()} />,
        );
      });
      act(() => {
        byLabel(renderer.root, "Предыдущий месяц")?.props.onPress();
      });
      const decFlat = texts(renderer.root).flat().join(" ");
      expect(decFlat).toContain("Декабрь");
      expect(decFlat).toContain("2025");

      act(() => {
        renderer.update(
          <MonthCalendarModal visible={false} selectedDate="2026-01-15" onSelect={jest.fn()} onClose={jest.fn()} />,
        );
      });
      act(() => {
        renderer.update(
          <MonthCalendarModal visible={true} selectedDate="2026-12-15" onSelect={jest.fn()} onClose={jest.fn()} />,
        );
      });
      act(() => {
        byLabel(renderer.root, "Следующий месяц")?.props.onPress();
      });
      const janFlat = texts(renderer.root).flat().join(" ");
      expect(janFlat).toContain("Январь");
      expect(janFlat).toContain("2027");
    });

    it("handles a leap-year February day grid correctly (29 Feb 2028 selectable)", () => {
      const onSelect = jest.fn();
      let renderer!: ReturnType<typeof create>;
      act(() => {
        renderer = create(
          <MonthCalendarModal visible={true} selectedDate="2028-02-01" onSelect={onSelect} onClose={jest.fn()} />,
        );
      });
      act(() => {
        byLabel(renderer.root, "29 Февраль 2028")?.props.onPress();
      });
      expect(onSelect).toHaveBeenCalledWith("2028-02-29");
    });
  });
});
