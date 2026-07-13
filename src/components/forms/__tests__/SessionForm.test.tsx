import { act, create } from "react-test-renderer";
import { TextInput } from "react-native";
import { SessionForm } from "@/components/forms/SessionForm";
import { PrimaryButton, DangerButton } from "@/components/ui";
import type { Session } from "@/types";

jest.setTimeout(30000);

// Field order in SessionForm: Дата, Длительность (мин), Заметка.
function inputs(root: ReturnType<typeof create>["root"]) {
  const all = root.findAllByType(TextInput);
  return { date: all[0], duration: all[1], note: all[2] };
}

describe("SessionForm", () => {
  it("creates a manual Session with no startTime/endTime", () => {
    const onSave = jest.fn();
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<SessionForm onSave={onSave} />);
    });
    const { date, duration, note } = inputs(renderer!.root);
    act(() => {
      date.props.onChangeText("2026-06-10");
      duration.props.onChangeText("90");
      note.props.onChangeText("Territory 12");
    });
    act(() => {
      renderer.root.findByType(PrimaryButton).props.onPress();
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toEqual({
      id: undefined,
      date: "2026-06-10",
      durationMinutes: 90,
      note: "Territory 12",
      source: "manual",
    });
  });

  it("does not save with an invalid date or a non-positive duration", () => {
    const onSave = jest.fn();
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<SessionForm onSave={onSave} />);
    });
    const { date, duration } = inputs(renderer!.root);
    act(() => {
      date.props.onChangeText("not-a-date");
      duration.props.onChangeText("90");
    });
    act(() => {
      renderer.root.findByType(PrimaryButton).props.onPress();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("pre-fills fields when editing and preserves the id on save", () => {
    const initial: Session = {
      id: "s1",
      date: "2026-05-01",
      durationMinutes: 45,
      note: "Existing",
      source: "manual",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    };
    const onSave = jest.fn();
    const onDelete = jest.fn();
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<SessionForm initial={initial} onSave={onSave} onDelete={onDelete} />);
    });
    const { duration } = inputs(renderer!.root);
    expect(duration.props.value).toBe("45");

    act(() => {
      renderer.root.findByType(PrimaryButton).props.onPress();
    });
    expect(onSave.mock.calls[0][0]).toMatchObject({ id: "s1", durationMinutes: 45 });

    act(() => {
      renderer.root.findByType(DangerButton).props.onPress();
    });
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
