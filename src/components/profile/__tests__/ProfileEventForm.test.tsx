// TASK_042 — Profile event add/edit form. Covers §6/§10 validation rules:
// empty/whitespace title rejected, future dates rejected with the exact
// required message, trimming, and Delete only appearing when editing.
import { act, create } from "react-test-renderer";
import { MonthCalendarModal } from "@/components/forms/MonthCalendarModal";
import { PrimaryButton } from "@/components/ui";
import { ProfileEventForm } from "../ProfileEventForm";

function findTexts(renderer: ReturnType<typeof create>): string[] {
  return renderer.root
    .findAllByType("Text" as never)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join("") : n.props.children))
    .filter((t): t is string => typeof t === "string");
}

function setDate(renderer: ReturnType<typeof create>, iso: string) {
  act(() => {
    renderer.root.findByType(MonthCalendarModal).props.onSelect(iso);
  });
}

function submit(renderer: ReturnType<typeof create>) {
  act(() => {
    renderer.root.findByType(PrimaryButton).props.onPress();
  });
}

describe("ProfileEventForm — title validation", () => {
  it("rejects an empty title and does not call onSave", () => {
    const onSave = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileEventForm onSave={onSave} />);
    });
    submit(renderer);
    expect(onSave).not.toHaveBeenCalled();
    expect(findTexts(renderer)).toContain("Введите название события");
  });

  it("rejects a whitespace-only title", () => {
    const onSave = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileEventForm onSave={onSave} />);
    });
    const input = renderer.root.findAllByProps({ accessibilityLabel: "Название события" })[0];
    act(() => {
      input.props.onChangeText("   ");
    });
    submit(renderer);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("trims surrounding whitespace from a valid title before saving", () => {
    const onSave = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileEventForm onSave={onSave} />);
    });
    const input = renderer.root.findAllByProps({ accessibilityLabel: "Название события" })[0];
    act(() => {
      input.props.onChangeText("  Крещение  ");
    });
    submit(renderer);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: "Крещение" }));
  });
});

describe("ProfileEventForm — future date validation", () => {
  it("rejects a future date with the exact required error message", () => {
    const onSave = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileEventForm onSave={onSave} />);
    });
    const input = renderer.root.findAllByProps({ accessibilityLabel: "Название события" })[0];
    act(() => {
      input.props.onChangeText("Событие");
    });
    setDate(renderer, "2099-01-01");
    submit(renderer);
    expect(onSave).not.toHaveBeenCalled();
    expect(findTexts(renderer)).toContain("Дата события не может быть в будущем");
  });

  it("accepts today's date", () => {
    const onSave = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileEventForm onSave={onSave} />);
    });
    const input = renderer.root.findAllByProps({ accessibilityLabel: "Название события" })[0];
    act(() => {
      input.props.onChangeText("Событие");
    });
    submit(renderer);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("accepts a past date and passes it through unchanged", () => {
    const onSave = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileEventForm onSave={onSave} />);
    });
    const input = renderer.root.findAllByProps({ accessibilityLabel: "Название события" })[0];
    act(() => {
      input.props.onChangeText("Крещение");
    });
    setDate(renderer, "2016-08-15");
    submit(renderer);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: "Крещение", date: "2016-08-15" }));
  });
});

describe("ProfileEventForm — editing an existing event", () => {
  const existing = { id: "ev-1", title: "Пионер", date: "2022-09-01" };

  it("pre-fills the title and date from the initial event", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileEventForm initial={existing} onSave={jest.fn()} />);
    });
    expect(findTexts(renderer)).toContain("01-09-2022");
    const input = renderer.root.findAllByProps({ accessibilityLabel: "Название события" })[0];
    expect(input.props.value).toBe("Пионер");
  });

  it("shows a Delete action only when editing an existing event", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileEventForm initial={existing} onSave={jest.fn()} onDelete={jest.fn()} />);
    });
    expect(findTexts(renderer)).toContain("Удалить");
  });

  it("shows no Delete action when adding a new event", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileEventForm onSave={jest.fn()} />);
    });
    expect(findTexts(renderer)).not.toContain("Удалить");
  });

  it("calls onSave with the original id when editing", () => {
    const onSave = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileEventForm initial={existing} onSave={onSave} />);
    });
    submit(renderer);
    expect(onSave).toHaveBeenCalledWith({ id: "ev-1", title: "Пионер", date: "2022-09-01" });
  });
});
