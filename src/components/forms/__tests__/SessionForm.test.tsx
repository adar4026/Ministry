import { act, create } from "react-test-renderer";
import { Text, TextInput } from "react-native";
import { SessionForm } from "@/components/forms/SessionForm";
import { WheelPicker } from "@/components/WheelPicker";
import { DangerButton } from "@/components/ui";
import type { Session } from "@/types";

jest.setTimeout(30000);

const ROUNDED_NOTICE = "Время округлено до ближайших 5 минут";

// Field order in SessionForm: Дата (TextInput), Заметка (TextInput,
// multiline). Duration is no longer a TextInput — it's the two WheelPicker
// instances (hours, minutes), driven directly via their onChange prop,
// mirroring how the date/note fields are driven via onChangeText.
function inputs(root: ReturnType<typeof create>["root"]) {
  const all = root.findAllByType(TextInput);
  return { date: all[0], note: all[1] };
}

function wheels(root: ReturnType<typeof create>["root"]) {
  const all = root.findAllByType(WheelPicker);
  return { hours: all[0], minutes: all[1] };
}

function hasRoundedNotice(root: ReturnType<typeof create>["root"]) {
  return root.findAllByType(Text).some((node) => node.props.children === ROUNDED_NOTICE);
}

type FormState = { canSubmit: boolean; submit: () => void };

function renderForm(props: Partial<Parameters<typeof SessionForm>[0]> = {}) {
  let state: FormState = { canSubmit: false, submit: () => {} };
  const onStateChange = jest.fn((s: FormState) => {
    state = s;
  });
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <SessionForm onSave={jest.fn()} onStateChange={onStateChange} {...props} />,
    );
  });
  return { renderer, getState: () => state };
}

function sessionWithDuration(id: string, durationMinutes: number): Session {
  return {
    id,
    date: "2026-05-01",
    durationMinutes,
    note: "",
    source: "timer",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  };
}

describe("SessionForm", () => {
  it("renders hours and minutes as two separate wheel selectors", () => {
    const { renderer } = renderForm();
    const { hours, minutes } = wheels(renderer.root);
    expect(hours).toBeTruthy();
    expect(minutes).toBeTruthy();
    expect(hours.props.value).toBe(0);
    expect(minutes.props.value).toBe(0);
  });

  it("exposes only the standard 5-minute steps for a new record", () => {
    const { renderer } = renderForm();
    const { minutes } = wheels(renderer.root);
    const values = minutes.props.items.map((item: { value: number }) => item.value);
    expect(values).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    expect(values).not.toContain(47);
  });

  it("saves 150 total minutes when the user selects 2 hours / 30 minutes (standard create flow)", () => {
    const onSave = jest.fn();
    const { renderer, getState } = renderForm({ onSave });
    const { date, note } = inputs(renderer.root);
    const { hours, minutes } = wheels(renderer.root);

    act(() => {
      date.props.onChangeText("2026-06-10");
      note.props.onChangeText("Territory 12");
      hours.props.onChange(2);
      minutes.props.onChange(30);
    });

    act(() => {
      getState().submit();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toEqual({
      id: undefined,
      date: "2026-06-10",
      durationMinutes: 150,
      note: "Territory 12",
      source: "manual",
    });
  });

  it("cannot submit 0 hours / 0 minutes", () => {
    const onSave = jest.fn();
    const { getState } = renderForm({ onSave });

    expect(getState().canSubmit).toBe(false);
    act(() => {
      getState().submit();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("does not save with an invalid date even if duration is set", () => {
    const onSave = jest.fn();
    const { renderer, getState } = renderForm({ onSave });
    const { date } = inputs(renderer.root);
    const { hours } = wheels(renderer.root);

    act(() => {
      date.props.onChangeText("not-a-date");
      hours.props.onChange(1);
    });
    expect(getState().canSubmit).toBe(false);
    act(() => {
      getState().submit();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("cancel (never calling submit) never creates or modifies a record", () => {
    const onSave = jest.fn();
    const { renderer } = renderForm({ onSave });
    const { note } = inputs(renderer.root);
    const { hours } = wheels(renderer.root);
    act(() => {
      note.props.onChangeText("Some note");
      hours.props.onChange(3);
    });
    // No submit() call — equivalent to the user pressing "Отмена".
    expect(onSave).not.toHaveBeenCalled();
  });

  it("initializes the wheels from an existing 2h30m entry and preserves id on save, with no rounding notice", () => {
    const initial = sessionWithDuration("s1", 150);
    const onSave = jest.fn();
    const onDelete = jest.fn();
    const { renderer, getState } = renderForm({ initial, onSave, onDelete });
    const { hours, minutes } = wheels(renderer.root);
    expect(hours.props.value).toBe(2);
    expect(minutes.props.value).toBe(30);
    expect(hasRoundedNotice(renderer.root)).toBe(false);

    act(() => {
      getState().submit();
    });
    expect(onSave.mock.calls[0][0]).toMatchObject({ id: "s1", durationMinutes: 150 });

    act(() => {
      renderer.root.findByType(DangerButton).props.onPress();
    });
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("normalizes a 47-minute legacy entry to 0 hours / 45 minutes and shows the rounding notice", () => {
    const initial = sessionWithDuration("s2", 47);
    const { renderer } = renderForm({ initial });
    const { hours, minutes } = wheels(renderer.root);
    expect(hours.props.value).toBe(0);
    expect(minutes.props.value).toBe(45);
    const values = minutes.props.items.map((item: { value: number }) => item.value);
    expect(values).not.toContain(47);
    expect(hasRoundedNotice(renderer.root)).toBe(true);
  });

  it("normalizes a 48-minute legacy entry to 0 hours / 50 minutes", () => {
    const initial = sessionWithDuration("s3", 48);
    const { renderer } = renderForm({ initial });
    const { hours, minutes } = wheels(renderer.root);
    expect(hours.props.value).toBe(0);
    expect(minutes.props.value).toBe(50);
  });

  it("normalizes a 58-minute legacy entry to 1 hour / 0 minutes (rollover)", () => {
    const initial = sessionWithDuration("s4", 58);
    const { renderer } = renderForm({ initial });
    const { hours, minutes } = wheels(renderer.root);
    expect(hours.props.value).toBe(1);
    expect(minutes.props.value).toBe(0);
  });

  it("normalizes a 107-minute legacy entry to 1 hour / 45 minutes", () => {
    const initial = sessionWithDuration("s5", 107);
    const { renderer } = renderForm({ initial });
    const { hours, minutes } = wheels(renderer.root);
    expect(hours.props.value).toBe(1);
    expect(minutes.props.value).toBe(45);
  });

  it("normalizes a 108-minute legacy entry to 1 hour / 50 minutes", () => {
    const initial = sessionWithDuration("s6", 108);
    const { renderer } = renderForm({ initial });
    const { hours, minutes } = wheels(renderer.root);
    expect(hours.props.value).toBe(1);
    expect(minutes.props.value).toBe(50);
  });

  it("saves 45 minutes when a normalized 47-minute record is saved untouched", () => {
    const initial = sessionWithDuration("s7", 47);
    const onSave = jest.fn();
    const { getState } = renderForm({ initial, onSave });
    act(() => {
      getState().submit();
    });
    expect(onSave.mock.calls[0][0]).toMatchObject({ id: "s7", durationMinutes: 45 });
  });

  it("saves 105 minutes when only the hour wheel is changed after opening a 47-minute entry", () => {
    const initial = sessionWithDuration("s8", 47);
    const onSave = jest.fn();
    const { renderer, getState } = renderForm({ initial, onSave });
    const { hours } = wheels(renderer.root);
    act(() => {
      hours.props.onChange(1);
    });
    act(() => {
      getState().submit();
    });
    expect(onSave.mock.calls[0][0]).toMatchObject({ id: "s8", durationMinutes: 105 });
  });

  it("saves 47 minutes exactly... normalized: editing only the note preserves the normalized 45", () => {
    const initial = sessionWithDuration("s9", 47);
    const onSave = jest.fn();
    const { renderer, getState } = renderForm({ initial, onSave });
    const { note } = inputs(renderer.root);
    act(() => {
      note.props.onChangeText("updated note");
    });
    act(() => {
      getState().submit();
    });
    expect(onSave.mock.calls[0][0]).toMatchObject({ id: "s9", durationMinutes: 45, note: "updated note" });
  });

  it("shows no rounding notice for a record already divisible by five", () => {
    const initial = sessionWithDuration("s10", 90);
    const { renderer } = renderForm({ initial });
    expect(hasRoundedNotice(renderer.root)).toBe(false);
  });

  it("clamps an out-of-range normalized duration to the maximum representable hour", () => {
    // 1567 minutes rounds to 1565 (26h05m); the hours wheel only goes to 24.
    const initial = sessionWithDuration("s11", 1567);
    const { renderer } = renderForm({ initial });
    const { hours, minutes } = wheels(renderer.root);
    expect(hours.props.value).toBe(24);
    expect(minutes.props.value).toBe(5);
  });
});
