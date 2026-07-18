// TASK_022 — TalkForm's date field shows/accepts DD-MM-YYYY (the app-wide
// visible format); the ISO value the store contract requires is only built
// internally, at submit().
import { act, create } from "react-test-renderer";
import { TextInput } from "react-native";
import { TalkForm } from "@/components/forms/TalkForm";
import { PrimaryButton } from "@/components/ui";
import type { Talk } from "@/types";

jest.setTimeout(30000);

// Field order in TalkForm: Дата, Номер речи, Название речи (all TextInput).
function inputs(root: ReturnType<typeof create>["root"]) {
  const all = root.findAllByType(TextInput);
  return { date: all[0], number: all[1], title: all[2] };
}

const TALK: Talk = {
  id: "t1",
  date: "2026-01-01",
  number: 75,
  title: "Пример речи",
  location: "Зал",
};

describe("TalkForm — TASK_022 date display", () => {
  it("shows an empty date field before any selection on a new record", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<TalkForm onSave={jest.fn()} />);
    });
    const { date } = inputs(renderer.root);
    expect(date.props.value).toBe("");
    expect(date.props.placeholder).toBe("28-06-2026");
  });

  it("shows an existing record's ISO date as DD-MM-YYYY when editing", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<TalkForm initial={TALK} onSave={jest.fn()} />);
    });
    const { date } = inputs(renderer.root);
    expect(date.props.value).toBe("01-01-2026");
  });

  it("typing DD-MM-YYYY and saving converts it back to ISO for onSave", () => {
    const onSave = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<TalkForm onSave={onSave} />);
    });
    const { date, number } = inputs(renderer.root);
    act(() => {
      date.props.onChangeText("31-12-2026");
      number.props.onChangeText("10");
    });
    act(() => {
      renderer.root.findByType(PrimaryButton).props.onPress();
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ date: "2026-12-31", number: 10 });
  });

  it("editing an existing record and saving without touching the date preserves the calendar day", () => {
    const onSave = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<TalkForm initial={TALK} onSave={onSave} />);
    });
    act(() => {
      renderer.root.findByType(PrimaryButton).props.onPress();
    });
    expect(onSave.mock.calls[0][0]).toMatchObject({ id: "t1", date: "2026-01-01" });
  });

  it("does not save with an ISO-formatted date typed into the visible field", () => {
    const onSave = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<TalkForm onSave={onSave} />);
    });
    const { date } = inputs(renderer.root);
    act(() => {
      date.props.onChangeText("2026-12-31");
    });
    act(() => {
      renderer.root.findByType(PrimaryButton).props.onPress();
    });
    expect(onSave).not.toHaveBeenCalled();
  });
});
