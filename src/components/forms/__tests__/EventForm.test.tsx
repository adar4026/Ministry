// TASK_022 — EventForm's date field shows/accepts DD-MM-YYYY (the app-wide
// visible format); the ISO value the store contract requires is only built
// internally, at submit().
import { act, create } from "react-test-renderer";
import { TextInput } from "react-native";
import { EventForm } from "@/components/forms/EventForm";
import { PrimaryButton } from "@/components/ui";
import type { MinistryEvent } from "@/types";

jest.setTimeout(30000);

// Field order in EventForm: Дата, Название (both TextInput).
function inputs(root: ReturnType<typeof create>["root"]) {
  const all = root.findAllByType(TextInput);
  return { date: all[0], title: all[1] };
}

const EVENT: MinistryEvent = {
  id: "e1",
  date: "2026-05-12",
  title: "Переезд",
  category: "move",
};

describe("EventForm — TASK_022 date display", () => {
  it("shows an empty date field before any selection on a new record", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<EventForm onSave={jest.fn()} />);
    });
    const { date } = inputs(renderer.root);
    expect(date.props.value).toBe("");
    expect(date.props.placeholder).toBe("28-06-2026");
  });

  it("shows an existing record's ISO date as DD-MM-YYYY when editing", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<EventForm initial={EVENT} onSave={jest.fn()} />);
    });
    const { date } = inputs(renderer.root);
    expect(date.props.value).toBe("12-05-2026");
  });

  it("typing DD-MM-YYYY and saving converts it back to ISO for onSave", () => {
    const onSave = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<EventForm onSave={onSave} />);
    });
    const { date, title } = inputs(renderer.root);
    act(() => {
      date.props.onChangeText("28-06-2026");
      title.props.onChangeText("Школа");
    });
    act(() => {
      renderer.root.findByType(PrimaryButton).props.onPress();
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ date: "2026-06-28", title: "Школа" });
  });

  it("editing an existing record and saving without touching the date preserves the calendar day", () => {
    const onSave = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<EventForm initial={EVENT} onSave={onSave} />);
    });
    act(() => {
      renderer.root.findByType(PrimaryButton).props.onPress();
    });
    expect(onSave.mock.calls[0][0]).toMatchObject({ id: "e1", date: "2026-05-12" });
  });

  it("does not save with an ISO-formatted date typed into the visible field", () => {
    const onSave = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<EventForm onSave={onSave} />);
    });
    const { date, title } = inputs(renderer.root);
    act(() => {
      date.props.onChangeText("2026-06-28");
      title.props.onChangeText("Школа");
    });
    act(() => {
      renderer.root.findByType(PrimaryButton).props.onPress();
    });
    expect(onSave).not.toHaveBeenCalled();
  });
});
