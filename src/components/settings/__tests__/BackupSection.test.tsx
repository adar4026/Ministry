import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create } from "react-test-renderer";
import { Text } from "react-native";
import { BackupSection } from "@/components/settings/BackupSection";
import { StoreProvider, STORAGE_KEYS, useStore } from "@/store/StoreContext";
import { buildBackup } from "@/data/backup";
import { PrimaryButton, DangerButton } from "@/components/ui";
import type { HourRecord, MinistryEvent, Session, Talk } from "@/types";

jest.mock("@/data/backupFile");
import { pickBackupFile, saveBackupFile } from "@/data/backupFile";
import type { PickBackupFileCallbacks } from "@/data/backupFile.web";

// pickBackupFile is now callback-based (TASK_013 iOS PWA follow-up) rather
// than Promise-returning — these helpers drive the mock the same way the
// real web implementation would invoke the callbacks it's given.
function mockPickSelected(json: string) {
  (pickBackupFile as jest.Mock).mockImplementation((callbacks: PickBackupFileCallbacks) => {
    callbacks.onSelected(json);
  });
}
function mockPickSelectedOnce(json: string) {
  (pickBackupFile as jest.Mock).mockImplementationOnce((callbacks: PickBackupFileCallbacks) => {
    callbacks.onSelected(json);
  });
}
function mockPickError(err: Error) {
  (pickBackupFile as jest.Mock).mockImplementation((callbacks: PickBackupFileCallbacks) => {
    callbacks.onError(err);
  });
}
function mockPickCancelledOnce() {
  (pickBackupFile as jest.Mock).mockImplementationOnce((callbacks: PickBackupFileCallbacks) => {
    callbacks.onCancelled();
  });
}

const RECORD: HourRecord = { id: "r1", year: 2026, month: 6, hours: 12, note: "" };
const EVENT: MinistryEvent = { id: "e1", date: "2026-06-01", title: "Test event", category: "personal" };
const TALK: Talk = { id: "t1", date: "2026-06-02", number: 3, title: "Talk", location: "Hall" };
const SESSION: Session = {
  id: "s1",
  date: "2026-06-03",
  durationMinutes: 90,
  note: "",
  source: "manual",
  createdAt: "2026-06-03T10:00:00.000Z",
  updatedAt: "2026-06-03T10:00:00.000Z",
};

type Store = ReturnType<typeof useStore>;

function Harness({ onReady }: { onReady?: (store: Store) => void }) {
  const store = useStore();
  onReady?.(store);
  return <BackupSection />;
}

async function renderSection() {
  let latest: Store | null = null;
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Harness onReady={(s) => { latest = s; }} />
      </StoreProvider>,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return { renderer, getStore: () => latest as unknown as Store };
}

// react-native's Pressable doesn't reliably match findAllByType across this
// project's RN/jest-expo setup, so locate it structurally instead: any node
// exposing both the accessibilityLabel and an onPress handler.
function pressableFor(root: ReturnType<typeof create>["root"], label: string) {
  return root
    .findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === "function")
    .at(0);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

function feedbackTexts(renderer: ReturnType<typeof create>): string[] {
  return renderer.root
    .findAllByType(Text)
    .map((n) => n.props.children)
    .filter((c): c is string => typeof c === "string");
}

describe("BackupSection — export", () => {
  it("has an accessible export button that triggers saveBackupFile", async () => {
    const { renderer } = await renderSection();
    const btn = pressableFor(renderer.root, "Экспортировать данные");
    expect(btn).toBeTruthy();
    await act(async () => {
      btn!.props.onPress();
      await Promise.resolve();
    });
    expect(saveBackupFile).toHaveBeenCalledTimes(1);
    const [filename, json] = (saveBackupFile as jest.Mock).mock.calls[0];
    expect(filename).toMatch(/^ministry-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/);
    expect(JSON.parse(json).format).toBe("ministry-backup");
  });
});

describe("BackupSection — import preview", () => {
  it("shows correct counts in the preview and performs no writes until confirmed", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD]));
    const backup = buildBackup({ records: [], events: [EVENT], talks: [TALK], sessions: [SESSION] });
    mockPickSelected(JSON.stringify(backup));

    const { renderer } = await renderSection();
    const importBtn = pressableFor(renderer.root, "Импортировать данные");
    await act(async () => {
      importBtn!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Preview shows incoming counts (1 event, 1 talk, 1 session, 0 records).
    const ones = renderer.root.findAllByType(Text).filter((n) => String(n.props.children) === "1");
    expect(ones.length).toBeGreaterThanOrEqual(3);

    // No writes happened yet — records key still holds the pre-existing value.
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
  });

  // TASK_022: "Создана" must show the app-wide DD-MM-YYYY date format
  // (dots were the previous, now-fixed formatBackupTimestamp() output).
  it("shows the backup's creation date as DD-MM-YYYY in the preview, not dot-separated", async () => {
    const backup = { ...buildBackup({ records: [], events: [], talks: [], sessions: [] }), createdAt: "2026-06-03T10:00:00.000Z" };
    mockPickSelected(JSON.stringify(backup));

    const { renderer } = await renderSection();
    const importBtn = pressableFor(renderer.root, "Импортировать данные");
    await act(async () => {
      importBtn!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    const texts = renderer.root
      .findAllByType(Text)
      .map((n) => n.props.children)
      .filter((c): c is string => typeof c === "string");
    expect(texts.some((t) => /^03-06-2026 \d{2}:\d{2}$/.test(t))).toBe(true);
    expect(texts.some((t) => t.includes("03.06.2026"))).toBe(false);
  });

  it("cancel performs no writes and dismisses the preview", async () => {
    const backup = buildBackup({ records: [RECORD], events: [], talks: [], sessions: [] });
    mockPickSelected(JSON.stringify(backup));

    const { renderer } = await renderSection();
    // StoreProvider seeds mj_records_v1 with "[]" on first hydration — capture
    // that baseline so we can prove cancel writes nothing, rather than
    // asserting the key stays absent (it never was).
    const before = await AsyncStorage.getItem(STORAGE_KEYS.records);

    const importBtn = pressableFor(renderer.root, "Импортировать данные");
    await act(async () => {
      importBtn!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      renderer.root.findByType(PrimaryButton).props.onPress();
    });

    expect(await AsyncStorage.getItem(STORAGE_KEYS.records)).toBe(before);
  });

  it("confirmed import replaces supported keys, updates the live StoreContext, and shows success — no reload required", async () => {
    const backup = buildBackup({ records: [RECORD], events: [EVENT], talks: [TALK], sessions: [SESSION] });
    mockPickSelected(JSON.stringify(backup));

    const { renderer, getStore } = await renderSection();
    // Sanity: live context starts empty (fresh install), matching the bug
    // report's "installed PWA starts empty" scenario.
    expect(getStore().records).toEqual([]);

    const importBtn = pressableFor(renderer.root, "Импортировать данные");
    await act(async () => {
      importBtn!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      renderer.root.findByType(DangerButton).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    // 1. Storage holds the imported data.
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
    // 2. THE ACTUAL FIX: the live StoreContext also reflects it, with no
    //    reload — this is what was missing before (Alert.alert's onPress
    //    callback, which used to trigger reload, never fires on web).
    expect(getStore().records).toEqual([RECORD]);
    expect(getStore().events).toEqual([EVENT]);
    expect(getStore().talks).toEqual([TALK]);
    expect(getStore().sessions).toEqual([SESSION]);
    // 3. Success is shown via inline UI (Alert.alert is a no-op on web and
    //    is no longer used for this).
    const texts = feedbackTexts(renderer);
    expect(texts).toContain("Импорт завершён");
  });

  it("rejects invalid JSON without showing a preview or writing anything", async () => {
    mockPickSelected("{not valid json");

    const { renderer } = await renderSection();
    const before = await AsyncStorage.getItem(STORAGE_KEYS.records);
    const importBtn = pressableFor(renderer.root, "Импортировать данные");
    await act(async () => {
      importBtn!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(feedbackTexts(renderer)).toContain("Не удалось импортировать");
    expect(await AsyncStorage.getItem(STORAGE_KEYS.records)).toBe(before);
  });

  it("silently ignores a cancelled file picker (no error feedback)", async () => {
    mockPickError(new Error("no-file-selected"));

    const { renderer } = await renderSection();
    const importBtn = pressableFor(renderer.root, "Импортировать данные");
    await act(async () => {
      importBtn!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(feedbackTexts(renderer)).not.toContain("Не удалось выбрать файл");
  });

  it("re-enables the import button after a cancelled pick (fallback cancellation doesn't strand the UI)", async () => {
    // Simulates backupFile.web.ts's focus-idle heuristic calling onCancelled
    // once the native picker is dismissed without a `change` ever arriving.
    mockPickCancelledOnce();

    const { renderer } = await renderSection();
    const importBtn = pressableFor(renderer.root, "Импортировать данные");
    await act(async () => {
      importBtn!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    // The button must not stay disabled/stuck in a "picking" state.
    const importBtnAfter = pressableFor(renderer.root, "Импортировать данные");
    expect(importBtnAfter!.props.disabled).toBe(false);

    // And it must be usable again immediately — a second pick attempt works.
    const backup = buildBackup({ records: [RECORD], events: [], talks: [], sessions: [] });
    mockPickSelectedOnce(JSON.stringify(backup));
    await act(async () => {
      importBtnAfter!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renderer.root.findByType(DangerButton)).toBeTruthy();
  });

  it("a delayed onSelected arriving after onCancelled already fired still opens the preview (iOS PWA race)", async () => {
    // Simulates the exact production bug: focus returns from Files, the
    // focus-idle heuristic fires first (busy UI relaxed, button re-enabled),
    // and only afterward does the real `change`/file-read outcome arrive.
    const backup = buildBackup({ records: [RECORD], events: [], talks: [], sessions: [] });
    let captured: PickBackupFileCallbacks | undefined;
    (pickBackupFile as jest.Mock).mockImplementation((callbacks: PickBackupFileCallbacks) => {
      captured = callbacks;
    });

    const { renderer } = await renderSection();
    const importBtn = pressableFor(renderer.root, "Импортировать данные");
    await act(async () => {
      importBtn!.props.onPress();
    });

    await act(async () => {
      captured!.onCancelled();
    });
    // No preview yet, no error shown, button re-enabled.
    expect(renderer.root.findAllByType(DangerButton).length).toBe(0);
    expect(feedbackTexts(renderer)).not.toContain("Не удалось выбрать файл");
    const importBtnAfterIdle = pressableFor(renderer.root, "Импортировать данные");
    expect(importBtnAfterIdle!.props.disabled).toBe(false);

    // The delayed selection arrives afterward — must still open the preview.
    await act(async () => {
      captured!.onSelected(JSON.stringify(backup));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(renderer.root.findByType(DangerButton)).toBeTruthy();
  });
});
