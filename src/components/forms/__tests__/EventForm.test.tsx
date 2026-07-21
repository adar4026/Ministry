// TASK_022 — EventForm's date field shows/accepts DD-MM-YYYY (the app-wide
// visible format); the ISO value the store contract requires is only built
// internally, at submit().
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { Pressable, Text, TextInput } from "react-native";
import { EventForm } from "@/components/forms/EventForm";
import { PrimaryButton } from "@/components/ui";
import type { CustomCategory, MinistryEvent } from "@/types";

// react-native's `Pressable` export is `React.memo(InnerPressable)` —
// react-test-renderer reports a TestInstance's `.type` as the inner
// function, not the memo wrapper (same convention as
// app/(tabs)/__tests__/timeline.test.tsx).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PressableInner = (Pressable as any).type;

function pressableAncestorOfText(root: ReactTestRenderer["root"], text: string) {
  const textNode = root.findAllByType(Text).find((n) => n.props.children === text);
  if (!textNode) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = textNode.parent;
  while (node && node.type !== PressableInner) node = node.parent;
  return node ?? undefined;
}

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

// TASK_045 — user-created topics appear in the same ChipSelector as the
// system categories, both when creating and when editing an event.
describe("EventForm — custom categories (TASK_045)", () => {
  const CUSTOM: CustomCategory[] = [{ id: "cc1", name: "Конгрессы" }];

  it("omits any custom-category chip when none are passed (existing callers unaffected)", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<EventForm onSave={jest.fn()} />);
    });
    const texts = renderer.root.findAllByType(Text).map((n) => n.props.children);
    expect(texts).not.toContain("Конгрессы");
  });

  it("shows a chip for each passed custom category", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<EventForm customCategories={CUSTOM} onSave={jest.fn()} />);
    });
    const texts = renderer.root.findAllByType(Text).map((n) => n.props.children);
    expect(texts).toContain("Конгрессы");
  });

  it("saves an event with a custom category's id when its chip is selected", () => {
    const onSave = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<EventForm customCategories={CUSTOM} onSave={onSave} />);
    });
    const { date, title } = inputs(renderer.root);
    act(() => {
      date.props.onChangeText("28-06-2026");
      title.props.onChangeText("Конгресс округа");
    });
    const chip = pressableAncestorOfText(renderer.root, "Конгрессы");
    expect(chip).toBeTruthy();
    act(() => {
      chip!.props.onPress();
    });
    act(() => {
      renderer.root.findByType(PrimaryButton).props.onPress();
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ category: "cc1" });
  });

  it("preserves an existing event's custom category when editing without changing it", () => {
    const onSave = jest.fn();
    const initial: MinistryEvent = { id: "e2", date: "2026-06-01", title: "Встреча", category: "cc1" };
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<EventForm initial={initial} customCategories={CUSTOM} onSave={onSave} />);
    });
    act(() => {
      renderer.root.findByType(PrimaryButton).props.onPress();
    });
    expect(onSave.mock.calls[0][0]).toMatchObject({ category: "cc1" });
  });
});
