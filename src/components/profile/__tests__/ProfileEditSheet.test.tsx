// TASK_042 revision — Profile edit sheet (A-Lex Finance-style bottom sheet).
// Covers: draft reset on open (discards a prior unsaved session), add/edit/
// delete of events through the nested event-editor modal, the 3-event
// limit's UI text, "Готово" committing the full draft (including the async
// native photo-storage commit step), and delete going through the project's
// confirmAsync pattern (TASK_034) rather than a raw Alert.alert.
import { act, create } from "react-test-renderer";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ProfileEventForm } from "../ProfileEventForm";
import { ProfileEditSheet } from "../ProfileEditSheet";
import type { UserProfile } from "@/types";

jest.mock("@/utils/profilePhoto", () => ({ pickProfilePhoto: jest.fn() }));
jest.mock("@/utils/confirm", () => ({ confirmAsync: jest.fn() }));
jest.mock("@/utils/profilePhotoStorage", () => ({
  commitProfilePhoto: jest.fn((newUri: string | undefined) => Promise.resolve(newUri)),
}));

import { pickProfilePhoto } from "@/utils/profilePhoto";
import { confirmAsync } from "@/utils/confirm";
import { commitProfilePhoto } from "@/utils/profilePhotoStorage";

const mockPick = pickProfilePhoto as jest.Mock;
const mockConfirm = confirmAsync as jest.Mock;
const mockCommitPhoto = commitProfilePhoto as jest.Mock;

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return { events: [], ...overrides };
}

function renderSheet(props: {
  visible: boolean;
  profile: UserProfile;
  onSave: (input: unknown) => void;
  onClose: () => void;
}) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <ProfileEditSheet {...props} />
      </SafeAreaProvider>,
    );
  });
  return renderer;
}

function findTexts(renderer: ReturnType<typeof create>): string[] {
  return renderer.root
    .findAllByType("Text" as never)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join("") : n.props.children))
    .filter((t): t is string => typeof t === "string");
}

function doneButton(renderer: ReturnType<typeof create>) {
  return renderer.root.findByProps({ accessibilityLabel: "Сохранить" });
}

async function pressDone(renderer: ReturnType<typeof create>) {
  await act(async () => {
    await doneButton(renderer).props.onPress();
  });
}

beforeEach(() => {
  mockPick.mockReset();
  mockConfirm.mockReset();
  mockCommitPhoto.mockReset();
  mockCommitPhoto.mockImplementation((newUri: string | undefined) => Promise.resolve(newUri));
});

describe("ProfileEditSheet — draft lifecycle", () => {
  it("seeds the draft from the profile prop every time it opens", () => {
    const p = profile({ displayName: "Александр", events: [{ id: "1", title: "Крещение", date: "2016-08-15" }] });
    const renderer = renderSheet({ visible: false, profile: p, onSave: jest.fn(), onClose: jest.fn() });
    act(() => {
      renderer.update(
        <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
          <ProfileEditSheet visible={true} profile={p} onSave={jest.fn()} onClose={jest.fn()} />
        </SafeAreaProvider>,
      );
    });
    expect(findTexts(renderer).join(" ")).toContain("Крещение");
  });

  it("Готово commits the full draft (name, photo, events) via onSave and closes", async () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const p = profile();
    const renderer = renderSheet({ visible: true, profile: p, onSave, onClose });
    await pressDone(renderer);
    expect(onSave).toHaveBeenCalledWith({ displayName: "", profilePhotoUri: undefined, events: [] });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call commitProfilePhoto when the photo is unchanged", async () => {
    const p = profile({ profilePhotoUri: "file:///same.jpg" });
    const renderer = renderSheet({ visible: true, profile: p, onSave: jest.fn(), onClose: jest.fn() });
    await pressDone(renderer);
    expect(mockCommitPhoto).not.toHaveBeenCalled();
  });
});

describe("ProfileEditSheet — adding an event", () => {
  it("shows '+ Добавить событие' below fewer than 3 events", () => {
    const p = profile({ events: [{ id: "1", title: "Крещение", date: "2016-08-15" }] });
    const renderer = renderSheet({ visible: true, profile: p, onSave: jest.fn(), onClose: jest.fn() });
    expect(findTexts(renderer)).toContain("+ Добавить событие");
  });

  it("shows the max-reached message instead of the add action at 3 events", () => {
    const p = profile({
      events: [
        { id: "1", title: "A", date: "2020-01-01" },
        { id: "2", title: "B", date: "2020-01-02" },
        { id: "3", title: "C", date: "2020-01-03" },
      ],
    });
    const renderer = renderSheet({ visible: true, profile: p, onSave: jest.fn(), onClose: jest.fn() });
    const texts = findTexts(renderer);
    expect(texts).not.toContain("+ Добавить событие");
    expect(texts).toContain("Добавлено максимальное количество событий");
  });

  it("adding a new event via the nested form appends it to the draft and Готово saves it", async () => {
    const onSave = jest.fn();
    const p = profile();
    const renderer = renderSheet({ visible: true, profile: p, onSave, onClose: jest.fn() });
    act(() => {
      renderer.root.findByProps({ accessibilityLabel: "Добавить событие" }).props.onPress();
    });
    act(() => {
      renderer.root.findByType(ProfileEventForm).props.onSave({ title: "Крещение", date: "2016-08-15" });
    });
    expect(findTexts(renderer).join(" ")).toContain("Крещение");

    await pressDone(renderer);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ events: [expect.objectContaining({ title: "Крещение", date: "2016-08-15" })] }),
    );
  });
});

describe("ProfileEditSheet — editing and deleting an event", () => {
  const existing = { id: "ev-1", title: "Пионер", date: "2022-09-01" };

  it("opens the nested form pre-filled when the event row is pressed", () => {
    const p = profile({ events: [existing] });
    const renderer = renderSheet({ visible: true, profile: p, onSave: jest.fn(), onClose: jest.fn() });
    act(() => {
      renderer.root.findByProps({ accessibilityLabel: "Редактировать событие: Пионер" }).props.onPress();
    });
    expect(renderer.root.findByType(ProfileEventForm).props.initial).toEqual(existing);
  });

  it("saving an edit updates the existing event in place (same id)", async () => {
    const onSave = jest.fn();
    const p = profile({ events: [existing] });
    const renderer = renderSheet({ visible: true, profile: p, onSave, onClose: jest.fn() });
    act(() => {
      renderer.root.findByProps({ accessibilityLabel: "Редактировать событие: Пионер" }).props.onPress();
    });
    act(() => {
      renderer.root.findByType(ProfileEventForm).props.onSave({ id: "ev-1", title: "Пионер (изменено)", date: "2022-09-01" });
    });
    await pressDone(renderer);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ events: [{ id: "ev-1", title: "Пионер (изменено)", date: "2022-09-01" }] }),
    );
  });

  it("deleting asks for confirmation via confirmAsync and removes the event only when confirmed", async () => {
    mockConfirm.mockResolvedValue(true);
    const onSave = jest.fn();
    const p = profile({ events: [existing] });
    const renderer = renderSheet({ visible: true, profile: p, onSave, onClose: jest.fn() });
    act(() => {
      renderer.root.findByProps({ accessibilityLabel: "Редактировать событие: Пионер" }).props.onPress();
    });
    await act(async () => {
      await renderer.root.findByType(ProfileEventForm).props.onDelete();
    });
    expect(mockConfirm).toHaveBeenCalled();
    expect(findTexts(renderer).join(" ")).not.toContain("Пионер");

    await pressDone(renderer);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ events: [] }));
  });

  it("does not remove the event when the user declines the confirmation", async () => {
    mockConfirm.mockResolvedValue(false);
    const p = profile({ events: [existing] });
    const renderer = renderSheet({ visible: true, profile: p, onSave: jest.fn(), onClose: jest.fn() });
    act(() => {
      renderer.root.findByProps({ accessibilityLabel: "Редактировать событие: Пионер" }).props.onPress();
    });
    await act(async () => {
      await renderer.root.findByType(ProfileEventForm).props.onDelete();
    });
    expect(findTexts(renderer).join(" ")).toContain("Пионер");
  });
});

describe("ProfileEditSheet — photo", () => {
  it("selecting a photo via the picker updates the draft and commits it through commitProfilePhoto on Готово", async () => {
    mockPick.mockImplementation(({ onSelected }: { onSelected: (uri: string) => void }) => {
      onSelected("file:///new-photo.jpg");
    });
    const onSave = jest.fn();
    const p = profile();
    const renderer = renderSheet({ visible: true, profile: p, onSave, onClose: jest.fn() });
    act(() => {
      renderer.root.findByProps({ accessibilityLabel: "Добавить фото" }).props.onPress();
    });
    await pressDone(renderer);
    expect(mockCommitPhoto).toHaveBeenCalledWith("file:///new-photo.jpg", undefined);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ profilePhotoUri: "file:///new-photo.jpg" }));
  });

  it("removing the photo clears it back to the placeholder on Готово", async () => {
    const onSave = jest.fn();
    const p = profile({ profilePhotoUri: "file:///old.jpg" });
    const renderer = renderSheet({ visible: true, profile: p, onSave, onClose: jest.fn() });
    act(() => {
      renderer.root.findByProps({ accessibilityLabel: "Удалить фотографию" }).props.onPress();
    });
    await pressDone(renderer);
    expect(mockCommitPhoto).toHaveBeenCalledWith(undefined, "file:///old.jpg");
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ profilePhotoUri: undefined }));
  });

  it("shows 'Сменить фото' (not 'Добавить фото') once a photo exists", () => {
    const p = profile({ profilePhotoUri: "file:///old.jpg" });
    const renderer = renderSheet({ visible: true, profile: p, onSave: jest.fn(), onClose: jest.fn() });
    expect(() => renderer.root.findByProps({ accessibilityLabel: "Сменить фото" })).not.toThrow();
  });

  it("keeps the old photo and shows an error when commitProfilePhoto fails, without closing", async () => {
    mockCommitPhoto.mockRejectedValue(new Error("copy-failed"));
    mockPick.mockImplementation(({ onSelected }: { onSelected: (uri: string) => void }) => {
      onSelected("file:///broken-pick.jpg");
    });
    const onSave = jest.fn();
    const onClose = jest.fn();
    const p = profile({ profilePhotoUri: "file:///old.jpg" });
    const renderer = renderSheet({ visible: true, profile: p, onSave, onClose });
    act(() => {
      renderer.root.findByProps({ accessibilityLabel: "Сменить фото" }).props.onPress();
    });
    await pressDone(renderer);
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(findTexts(renderer).join(" ")).toContain("Не удалось сохранить фотографию");
  });
});
