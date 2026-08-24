import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create } from "react-test-renderer";
import { Text } from "react-native";
import { BackupSection } from "@/components/settings/BackupSection";
import { StoreProvider, STORAGE_KEYS, useStore } from "@/store/StoreContext";
import { buildBackup, validateBackupJSON } from "@/data/backup";
import { BACKUP_META_KEYS } from "@/data/backupImport";
import { PrimaryButton, DangerButton } from "@/components/ui";
import type { CustomCategory, HourRecord, MinistryEvent, Session, Talk } from "@/types";

jest.mock("@/data/backupFile");
import { pickBackupFile, saveBackupFile } from "@/data/backupFile";
import type { PickBackupFileCallbacks } from "@/data/backupFile.web";

// pickBackupFile is callback-based (TASK_013 iOS PWA follow-up) rather than
// Promise-returning — these helpers drive the mock the same way the real web
// implementation would invoke the callbacks it's given.
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
const TOPIC: CustomCategory = { id: "x1784653775553td1", name: "Конгресс" };

/** A file in the legacy TASK_013 shape: version 1, no checksum, four collections. */
function v1FileJSON(data: {
  records?: unknown[];
  events?: unknown[];
  talks?: unknown[];
  sessions?: unknown[];
}) {
  const d = { records: [], events: [], talks: [], sessions: [], ...data };
  return JSON.stringify({
    format: "ministry-backup",
    version: 1,
    createdAt: "2026-08-22T09:19:00.000Z",
    appVersion: "0.4.4",
    data: d,
    counts: {
      records: d.records.length,
      events: d.events.length,
      talks: d.talks.length,
      sessions: d.sessions.length,
    },
  });
}

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

function texts(renderer: ReturnType<typeof create>): string[] {
  return renderer.root
    .findAllByType(Text)
    .map((n) => n.props.children)
    .filter((c): c is string => typeof c === "string");
}

/** Opens the restore preview for the given file contents. */
async function openPreview(renderer: ReturnType<typeof create>, json: string) {
  mockPickSelected(json);
  const btn = pressableFor(renderer.root, "Восстановить из копии");
  await act(async () => {
    btn!.props.onPress();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function confirmRestore(renderer: ReturnType<typeof create>) {
  await act(async () => {
    renderer.root.findByType(DangerButton).props.onPress();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe("BackupSection — exactly two actions (TASK_064)", () => {
  it("offers backup and restore, and no separate export row", async () => {
    const { renderer } = await renderSection();
    expect(pressableFor(renderer.root, "Создать резервную копию")).toBeTruthy();
    expect(pressableFor(renderer.root, "Восстановить из копии")).toBeTruthy();
    // The export row wrote the same payload under another name — removed so
    // the owner has one file to keep, not two identical ones to choose from.
    expect(pressableFor(renderer.root, "Экспортировать данные")).toBeUndefined();
    expect(texts(renderer)).not.toContain("Экспорт данных");
  });

  it("labels the two rows by what they do to the owner's data", async () => {
    const { renderer } = await renderSection();
    const all = texts(renderer);
    expect(all).toContain("Полная копия всех данных приложения");
    expect(all).toContain("Заменит все текущие данные приложения");
  });

  it("marks restore as the destructive action", async () => {
    const { renderer } = await renderSection();
    const row = renderer.root
      .findAll((n) => n.props.accessibilityLabel === "Восстановить из копии" && n.props.tone === "danger")
      .at(0);
    expect(row).toBeTruthy();
  });

  it("writes one checksummed .json file with everything in it", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD]));
    const { renderer } = await renderSection();
    await act(async () => {
      pressableFor(renderer.root, "Создать резервную копию")!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveBackupFile).toHaveBeenCalledTimes(1);
    const [filename, json, mime] = (saveBackupFile as jest.Mock).mock.calls[0];
    expect(filename).toMatch(/^ministry-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/);
    expect(filename).not.toContain(".mfb");
    // An honest MIME type is what stops iOS renaming or mis-typing the file.
    expect(mime).toBe("application/json");

    const parsed = JSON.parse(json);
    expect(parsed.format).toBe("ministry-backup");
    expect(parsed.version).toBe(2);
    expect(parsed.appVersion).toBeTruthy();
    expect(parsed.createdAt).toBeTruthy();
    expect(parsed.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(parsed.counts).toEqual({ records: 1, events: 0, talks: 0, sessions: 0, customCategories: 0 });
    expect(parsed.data.records).toEqual([RECORD]);
  });

  it("writes a file the app itself accepts back", async () => {
    const { renderer } = await renderSection();
    await act(async () => {
      pressableFor(renderer.root, "Создать резервную копию")!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    const json = (saveBackupFile as jest.Mock).mock.calls[0][1];
    const result = validateBackupJSON(json);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.checksum).toBe("verified");
  });

  it("shows «Резервная копия ещё не создавалась» until one is made, then the date and time", async () => {
    const { renderer } = await renderSection();
    expect(texts(renderer)).toContain("Резервная копия ещё не создавалась");

    await act(async () => {
      pressableFor(renderer.root, "Создать резервную копию")!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(texts(renderer).some((t) => /^Последняя копия: \d{2}-\d{2}-\d{4} \d{2}:\d{2}$/.test(t))).toBe(true);
    expect(await AsyncStorage.getItem(BACKUP_META_KEYS.lastBackupAt)).not.toBeNull();
  });

  it("puts the device's event topics into the backup file", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.customCategories, JSON.stringify([TOPIC]));
    const { renderer } = await renderSection();

    await act(async () => {
      pressableFor(renderer.root, "Создать резервную копию")!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    const parsed = JSON.parse((saveBackupFile as jest.Mock).mock.calls[0][1]);
    expect(parsed.data.customCategories).toEqual([TOPIC]);
  });
});

describe("BackupSection — restore preview", () => {
  it("shows the counts and writes nothing until confirmed", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD]));
    const backup = buildBackup({ records: [], events: [EVENT], talks: [TALK], sessions: [SESSION] });

    const { renderer } = await renderSection();
    await openPreview(renderer, JSON.stringify(backup));

    expect(texts(renderer)).toContain("Копия готова к восстановлению");
    const ones = renderer.root.findAllByType(Text).filter((n) => String(n.props.children) === "1");
    expect(ones.length).toBeGreaterThanOrEqual(3);

    // Nothing written yet — the records key still holds the pre-existing value.
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
  });

  it("states plainly that every current record will be replaced", async () => {
    const { renderer } = await renderSection();
    await openPreview(renderer, JSON.stringify(buildBackup({ records: [], events: [], talks: [], sessions: [] })));
    expect(texts(renderer)).toContain(
      "Все текущие данные Ministry на этом устройстве будут заменены данными из копии.",
    );
  });

  // TASK_022: "Создана" must show the app-wide DD-MM-YYYY date format
  // (dots were the previous, now-fixed formatBackupTimestamp() output).
  it("shows the backup's creation date as DD-MM-YYYY, not dot-separated", async () => {
    const backup = {
      ...buildBackup({ records: [], events: [], talks: [], sessions: [] }, new Date("2026-06-03T10:00:00.000Z")),
    };
    const { renderer } = await renderSection();
    await openPreview(renderer, JSON.stringify(backup));

    const all = texts(renderer);
    expect(all.some((t) => /^03-06-2026 \d{2}:\d{2}$/.test(t))).toBe(true);
    expect(all.some((t) => t.includes("03.06.2026"))).toBe(false);
  });

  it("marks a v2 file as version 2 with a verified checksum", async () => {
    const { renderer } = await renderSection();
    await openPreview(renderer, JSON.stringify(buildBackup({ records: [], events: [], talks: [], sessions: [] })));

    const all = texts(renderer);
    expect(all).toContain("Версия 2");
    expect(all).not.toContain("Версия 2 (.mfb)");
    expect(all).toContain("Проверена");
  });

  it("tells the owner when the file is an older but compatible copy", async () => {
    const { renderer } = await renderSection();
    await openPreview(renderer, v1FileJSON({ records: [RECORD] }));

    const all = texts(renderer);
    expect(all).toContain("Копия готова к восстановлению");
    expect(all).toContain("Версия 1 (старая, совместимая)");
    expect(all).toContain("Нет (у версии 1 её и не бывает)");
  });

  it("cancel writes nothing and dismisses the preview", async () => {
    const { renderer } = await renderSection();
    // StoreProvider seeds mj_records_v1 with "[]" on first hydration — capture
    // that baseline so we can prove cancel writes nothing, rather than
    // asserting the key stays absent (it never was).
    const before = await AsyncStorage.getItem(STORAGE_KEYS.records);

    await openPreview(renderer, JSON.stringify(buildBackup({ records: [RECORD], events: [], talks: [], sessions: [] })));
    await act(async () => {
      renderer.root.findByType(PrimaryButton).props.onPress();
    });

    expect(await AsyncStorage.getItem(STORAGE_KEYS.records)).toBe(before);
    expect(renderer.root.findAllByType(DangerButton).length).toBe(0);
  });
});

describe("BackupSection — restoring", () => {
  it("replaces storage, updates the live StoreContext and reports success — no reload required", async () => {
    const backup = buildBackup({ records: [RECORD], events: [EVENT], talks: [TALK], sessions: [SESSION] });

    const { renderer, getStore } = await renderSection();
    // Sanity: live context starts empty (fresh install), matching the bug
    // report's "installed PWA starts empty" scenario.
    expect(getStore().records).toEqual([]);

    await openPreview(renderer, JSON.stringify(backup));
    await confirmRestore(renderer);

    // 1. Storage holds the restored data.
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
    // 2. THE ACTUAL FIX (TASK_013): the live StoreContext reflects it too,
    //    with no reload — Alert.alert's onPress callback, which used to
    //    trigger the reload, never fires on react-native-web.
    expect(getStore().records).toEqual([RECORD]);
    expect(getStore().events).toEqual([EVENT]);
    expect(getStore().talks).toEqual([TALK]);
    expect(getStore().sessions).toEqual([SESSION]);
    // 3. Success is shown via inline UI.
    expect(texts(renderer)).toContain("Данные восстановлены");
  });

  it("saves a safety copy of the current data before replacing it", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD]));
    const { renderer } = await renderSection();

    await openPreview(renderer, v1FileJSON({}));
    await confirmRestore(renderer);

    const safety = JSON.parse((await AsyncStorage.getItem(BACKUP_META_KEYS.safety))!);
    expect(safety.data.records).toEqual([RECORD]);
  });

  it("restores a v1 copy whose talk has an empty number", async () => {
    // The record from the owner's real 22-08-2026 backup.
    const t6 = { id: "t6", date: "2026-06-28", number: null, title: "Речь 75", location: "Хихон" };

    const { renderer, getStore } = await renderSection();
    await openPreview(renderer, v1FileJSON({ talks: [t6] }));

    expect(texts(renderer)).toContain("Копия готова к восстановлению");
    await confirmRestore(renderer);

    expect(getStore().talks).toEqual([t6]);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.talks))!)).toEqual([t6]);
    expect(texts(renderer)).toContain("Данные восстановлены");
  });

  it("restores events on user-created topics (the real blocker in the 22-08-2026 copy)", async () => {
    const customEvent = { id: "e22", date: "2026-05-30", title: "Конгресс", category: TOPIC.id };

    const { renderer, getStore } = await renderSection();
    await openPreview(renderer, v1FileJSON({ events: [customEvent] }));
    await confirmRestore(renderer);

    expect(getStore().events).toEqual([customEvent]);
  });

  it("keeps creditHours through a full restore", async () => {
    const withCredit = { ...RECORD, creditHours: 4.5 };

    const { renderer, getStore } = await renderSection();
    await openPreview(renderer, v1FileJSON({ records: [withCredit] }));
    await confirmRestore(renderer);

    expect(getStore().records[0].creditHours).toBe(4.5);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)[0]).toEqual(withCredit);
  });

  it("ends up with exactly as many entities as the copy declared", async () => {
    const records = Array.from({ length: 7 }, (_, i) => ({ ...RECORD, id: `r${i}` }));
    const talks = Array.from({ length: 3 }, (_, i) => ({ ...TALK, id: `t${i}` }));

    const { renderer, getStore } = await renderSection();
    await openPreview(renderer, v1FileJSON({ records, talks }));
    await confirmRestore(renderer);

    expect(getStore().records).toHaveLength(7);
    expect(getStore().talks).toHaveLength(3);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toHaveLength(7);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.talks))!)).toHaveLength(3);
  });

  it("restores a copy that was created as a .mfb file (TASK_064)", async () => {
    // The exact bytes TASK_062 wrote: compact JSON, v2, checksummed. The
    // extension it was saved under never reaches the app — only the contents.
    const mfbContents = JSON.stringify(
      buildBackup({ records: [RECORD], events: [EVENT], talks: [TALK], sessions: [SESSION] }),
    );

    const { renderer, getStore } = await renderSection();
    await openPreview(renderer, mfbContents);
    expect(texts(renderer)).toContain("Копия готова к восстановлению");
    expect(texts(renderer)).toContain("Проверена");

    await confirmRestore(renderer);
    expect(getStore().records).toEqual([RECORD]);
    expect(getStore().talks).toEqual([TALK]);
    expect(texts(renderer)).toContain("Данные восстановлены");
  });

  it("does not wipe the device's own topics when restoring a v1 copy", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.customCategories, JSON.stringify([TOPIC]));

    const { renderer, getStore } = await renderSection();
    await openPreview(renderer, v1FileJSON({ records: [RECORD] }));
    await confirmRestore(renderer);

    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.customCategories))!)).toEqual([TOPIC]);
    expect(getStore().customCategories).toEqual([TOPIC]);
  });

  it("restores topics carried by a v2 copy", async () => {
    const backup = buildBackup({ records: [], events: [], talks: [], sessions: [], customCategories: [TOPIC] });

    const { renderer, getStore } = await renderSection();
    await openPreview(renderer, JSON.stringify(backup));
    await confirmRestore(renderer);

    expect(getStore().customCategories).toEqual([TOPIC]);
  });
});

describe("BackupSection — specific errors, shown before anything is touched", () => {
  async function errorFor(json: string) {
    const { renderer } = await renderSection();
    const before = await AsyncStorage.getItem(STORAGE_KEYS.records);
    await openPreview(renderer, json);
    return { renderer, all: texts(renderer), before };
  }

  it("says the JSON is unreadable, offers no restore button and writes nothing", async () => {
    const { renderer, all, before } = await errorFor("{not valid json");
    expect(all).toContain("Файл не удалось прочитать: неверный JSON.");
    expect(renderer.root.findAllByType(DangerButton).length).toBe(0);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.records)).toBe(before);
  });

  it("says a foreign file is not a Ministry backup", async () => {
    const { all } = await errorFor('{"format":"alex-finance-backup","version":2,"data":{}}');
    expect(all).toContain("Это не резервная копия Ministry.");
  });

  it("says the checksum does not match when a v2 file was edited", async () => {
    const backup = buildBackup({ records: [RECORD], events: [], talks: [], sessions: [] });
    const tampered = { ...backup, data: { ...backup.data, records: [{ ...RECORD, hours: 999 }] } };
    const { all } = await errorFor(JSON.stringify(tampered));
    expect(all).toContain("Контрольная сумма не совпадает: файл мог быть изменён или повреждён.");
  });

  it("names the entity, its position and the field for a critically broken record", async () => {
    const { date, ...noDate } = TALK;
    const { renderer, all, before } = await errorFor(v1FileJSON({ talks: [noDate] }));

    expect(all).toContain("Не удалось восстановить: у записи речи №1 (id: t1) отсутствует обязательная дата.");
    expect(all).toContain("• У записи речи №1 (id: t1) отсутствует обязательная дата.");
    expect(all).toContain("Текущие данные не изменены.");
    expect(all.some((t) => t.includes("повреждённые записи"))).toBe(false);
    expect(renderer.root.findAllByType(DangerButton).length).toBe(0);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.records)).toBe(before);
  });
});

describe("BackupSection — file picker behaviour", () => {
  it("silently ignores a cancelled file picker (no error feedback)", async () => {
    mockPickError(new Error("no-file-selected"));

    const { renderer } = await renderSection();
    await act(async () => {
      pressableFor(renderer.root, "Восстановить из копии")!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(texts(renderer)).not.toContain("Не удалось выбрать файл");
  });

  it("re-enables the restore row after a cancelled pick (fallback cancellation doesn't strand the UI)", async () => {
    // Simulates backupFile.web.ts's focus-idle heuristic calling onCancelled
    // once the native picker is dismissed without a `change` ever arriving.
    mockPickCancelledOnce();

    const { renderer } = await renderSection();
    const btn = pressableFor(renderer.root, "Восстановить из копии");
    await act(async () => {
      btn!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    const after = pressableFor(renderer.root, "Восстановить из копии");
    expect(after!.props.disabled).toBe(false);

    // And it must be usable again immediately — a second pick attempt works.
    mockPickSelectedOnce(JSON.stringify(buildBackup({ records: [RECORD], events: [], talks: [], sessions: [] })));
    await act(async () => {
      after!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renderer.root.findByType(DangerButton)).toBeTruthy();
  });

  it("a delayed onSelected arriving after onCancelled already fired still opens the preview (iOS PWA race)", async () => {
    // Simulates the exact production bug: focus returns from Files, the
    // focus-idle heuristic fires first (busy UI relaxed, row re-enabled),
    // and only afterward does the real `change`/file-read outcome arrive.
    const backup = buildBackup({ records: [RECORD], events: [], talks: [], sessions: [] });
    let captured: PickBackupFileCallbacks | undefined;
    (pickBackupFile as jest.Mock).mockImplementation((callbacks: PickBackupFileCallbacks) => {
      captured = callbacks;
    });

    const { renderer } = await renderSection();
    await act(async () => {
      pressableFor(renderer.root, "Восстановить из копии")!.props.onPress();
    });

    await act(async () => {
      captured!.onCancelled();
    });
    // No preview yet, no error shown, row re-enabled.
    expect(renderer.root.findAllByType(DangerButton).length).toBe(0);
    expect(texts(renderer)).not.toContain("Не удалось выбрать файл");
    expect(pressableFor(renderer.root, "Восстановить из копии")!.props.disabled).toBe(false);

    // The delayed selection arrives afterward — must still open the preview.
    await act(async () => {
      captured!.onSelected(JSON.stringify(backup));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(renderer.root.findByType(DangerButton)).toBeTruthy();
  });
});
