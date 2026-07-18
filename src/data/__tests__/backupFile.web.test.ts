/**
 * @jest-environment jsdom
 *
 * pickBackupFile() (TASK_013 iOS PWA follow-up) needs a real DOM — a shared
 * <input type=file>, window focus events, FileReader — so this suite
 * overrides the project's default (node) jest environment for just this
 * file via the pragma above.
 *
 * Covers the production bug this module fixes: on iOS Home Screen PWA, the
 * `change` event for a genuinely selected file can arrive well after (300ms,
 * 1s, or more) window focus returns from the Files app. The old
 * implementation raced a 300ms focus-based timer that rejected the pending
 * promise AND tore down the input/listeners — so a delayed `change` was
 * silently lost. This suite asserts the replacement never discards a
 * selection: `onCancelled` is a best-effort UI cue only, and the shared
 * input/listeners persist across attempts.
 */
import { pickBackupFile, type PickBackupFileCallbacks } from "@/data/backupFile.web";

const FOCUS_IDLE_DELAY_MS = 300;

// Real FileReader in jsdom reads asynchronously via its own internal timer,
// which would get tangled up with this suite's fake timers. Replace it with
// a minimal fake that resolves on a microtask (unaffected by fake timers)
// so we can test pickBackupFile's own event/timer logic in isolation.
class FakeFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsText(file: File & { __content?: string }) {
    Promise.resolve().then(() => {
      if (file.__content === undefined) {
        this.onerror?.();
        return;
      }
      this.result = file.__content;
      this.onload?.();
    });
  }
}

function makeFile(content: string, name = "backup.json"): File & { __content: string } {
  const file = new File([content], name, { type: "application/json" }) as File & { __content: string };
  file.__content = content;
  return file;
}

function setInputFiles(input: HTMLInputElement, file: File | null) {
  const list = file
    ? ({ 0: file, length: 1, item: (i: number) => (i === 0 ? file : null) } as unknown as FileList)
    : ({ length: 0, item: () => null } as unknown as FileList);
  Object.defineProperty(input, "files", { value: list, configurable: true });
}

function callbackSpies() {
  const onSelected = jest.fn();
  const onError = jest.fn();
  const onCancelled = jest.fn();
  const callbacks: PickBackupFileCallbacks = { onSelected, onError, onCancelled };
  return { callbacks, onSelected, onError, onCancelled };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

let originalFileReader: typeof FileReader;

beforeEach(() => {
  jest.useFakeTimers();
  originalFileReader = global.FileReader;
  (global as unknown as { FileReader: unknown }).FileReader = FakeFileReader;
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  (global as unknown as { FileReader: unknown }).FileReader = originalFileReader;
});

function getSharedInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]');
  if (!input) throw new Error("shared input not found — call pickBackupFile() first");
  return input as HTMLInputElement;
}

describe("pickBackupFile — success", () => {
  it("delivers the file's text via onSelected on immediate selection", async () => {
    const { callbacks, onSelected } = callbackSpies();
    pickBackupFile(callbacks);
    const input = getSharedInput();
    setInputFiles(input, makeFile('{"a":1}'));
    input.dispatchEvent(new Event("change"));

    await flushMicrotasks();
    expect(onSelected).toHaveBeenCalledWith('{"a":1}');
  });

  it("resets input.value after handling so the same file can be selected again", async () => {
    const { callbacks } = callbackSpies();
    pickBackupFile(callbacks);
    const input = getSharedInput();
    setInputFiles(input, makeFile("{}"));
    input.dispatchEvent(new Event("change"));
    await flushMicrotasks();

    expect(input.value).toBe("");
  });

  it("reuses the same shared input across repeated picks (no leaked nodes)", async () => {
    const { callbacks: c1 } = callbackSpies();
    pickBackupFile(c1);
    const input1 = getSharedInput();
    setInputFiles(input1, makeFile('{"first":true}'));
    input1.dispatchEvent(new Event("change"));
    await flushMicrotasks();

    const { callbacks: c2, onSelected: onSelected2 } = callbackSpies();
    pickBackupFile(c2);
    const input2 = getSharedInput();
    expect(input2).toBe(input1); // same node reused, not recreated

    setInputFiles(input2, makeFile('{"second":true}'));
    input2.dispatchEvent(new Event("change"));
    await flushMicrotasks();
    expect(onSelected2).toHaveBeenCalledWith('{"second":true}');

    expect(document.querySelectorAll('input[type="file"]').length).toBe(1);
  });

  it("selecting a different file on the next attempt delivers the new content", async () => {
    const { callbacks: c1, onSelected: onSelected1 } = callbackSpies();
    pickBackupFile(c1);
    const input = getSharedInput();
    setInputFiles(input, makeFile('{"file":"one"}'));
    input.dispatchEvent(new Event("change"));
    await flushMicrotasks();
    expect(onSelected1).toHaveBeenCalledWith('{"file":"one"}');

    const { callbacks: c2, onSelected: onSelected2 } = callbackSpies();
    pickBackupFile(c2);
    setInputFiles(input, makeFile('{"file":"two"}'));
    input.dispatchEvent(new Event("change"));
    await flushMicrotasks();
    expect(onSelected2).toHaveBeenCalledWith('{"file":"two"}');
    expect(onSelected1).toHaveBeenCalledTimes(1); // the stale attempt's callback isn't re-invoked
  });
});

describe("pickBackupFile — the iOS delayed-change race", () => {
  it("still delivers the file when change arrives 301ms after focus returns", async () => {
    const { callbacks, onSelected, onCancelled } = callbackSpies();
    pickBackupFile(callbacks);
    const input = getSharedInput();

    window.dispatchEvent(new Event("focus"));
    jest.advanceTimersByTime(FOCUS_IDLE_DELAY_MS + 1);
    expect(onCancelled).toHaveBeenCalledTimes(1); // busy UI relaxed...

    setInputFiles(input, makeFile('{"delayed":true}'));
    input.dispatchEvent(new Event("change"));
    await flushMicrotasks();

    expect(onSelected).toHaveBeenCalledWith('{"delayed":true}'); // ...but the file is still honored
  });

  it("still delivers the file when change arrives a full second after focus returns", async () => {
    const { callbacks, onSelected } = callbackSpies();
    pickBackupFile(callbacks);
    const input = getSharedInput();

    window.dispatchEvent(new Event("focus"));
    jest.advanceTimersByTime(1000);

    setInputFiles(input, makeFile('{"veryDelayed":true}'));
    input.dispatchEvent(new Event("change"));
    await flushMicrotasks();

    expect(onSelected).toHaveBeenCalledWith('{"veryDelayed":true}');
  });

  it("does not call onError for a delayed change — a valid selection is never discarded because of focus", async () => {
    const { callbacks, onError } = callbackSpies();
    pickBackupFile(callbacks);
    const input = getSharedInput();

    window.dispatchEvent(new Event("focus"));
    jest.advanceTimersByTime(5000);
    setInputFiles(input, makeFile("{}"));
    input.dispatchEvent(new Event("change"));
    await flushMicrotasks();

    expect(onError).not.toHaveBeenCalled();
  });

  it("does not call onSelected/onError before change arrives, even once idle", async () => {
    const { callbacks, onSelected, onError } = callbackSpies();
    pickBackupFile(callbacks);
    window.dispatchEvent(new Event("focus"));
    jest.advanceTimersByTime(FOCUS_IDLE_DELAY_MS);

    expect(onSelected).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});

describe("pickBackupFile — cancellation", () => {
  it("calls onCancelled on an explicit cancel event", async () => {
    const { callbacks, onCancelled, onError } = callbackSpies();
    pickBackupFile(callbacks);
    const input = getSharedInput();
    input.dispatchEvent(new Event("cancel"));

    expect(onCancelled).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("calls onCancelled via the focus-idle heuristic when neither change nor cancel fires", async () => {
    const { callbacks, onCancelled } = callbackSpies();
    pickBackupFile(callbacks);
    getSharedInput();

    window.dispatchEvent(new Event("focus"));
    jest.advanceTimersByTime(FOCUS_IDLE_DELAY_MS);

    expect(onCancelled).toHaveBeenCalledTimes(1);
  });

  it("does not call onCancelled if change arrives shortly after focus (before the idle delay elapses)", async () => {
    const { callbacks, onCancelled, onSelected } = callbackSpies();
    pickBackupFile(callbacks);
    const input = getSharedInput();

    window.dispatchEvent(new Event("focus"));
    setInputFiles(input, makeFile('{"ok":true}'));
    input.dispatchEvent(new Event("change"));
    jest.advanceTimersByTime(FOCUS_IDLE_DELAY_MS);
    await flushMicrotasks();

    expect(onCancelled).not.toHaveBeenCalled();
    expect(onSelected).toHaveBeenCalledWith('{"ok":true}');
  });

  it("does not call onCancelled twice when both an explicit cancel and the focus fallback occur", async () => {
    const { callbacks, onCancelled } = callbackSpies();
    pickBackupFile(callbacks);
    const input = getSharedInput();

    window.dispatchEvent(new Event("focus"));
    input.dispatchEvent(new Event("cancel"));
    jest.advanceTimersByTime(FOCUS_IDLE_DELAY_MS);

    expect(onCancelled).toHaveBeenCalledTimes(1);
  });

  it("a stray/late cancel after a file was already picked up does not fire onCancelled", async () => {
    const { callbacks, onSelected, onCancelled } = callbackSpies();
    pickBackupFile(callbacks);
    const input = getSharedInput();
    setInputFiles(input, makeFile('{"first":true}'));
    input.dispatchEvent(new Event("change"));
    input.dispatchEvent(new Event("cancel")); // must be ignored — already resolved

    await flushMicrotasks();
    expect(onSelected).toHaveBeenCalledWith('{"first":true}');
    expect(onCancelled).not.toHaveBeenCalled();
  });

  it("cancellation does not prevent a later pick attempt from working", async () => {
    const { callbacks: c1, onCancelled } = callbackSpies();
    pickBackupFile(c1);
    const input = getSharedInput();
    input.dispatchEvent(new Event("cancel"));
    expect(onCancelled).toHaveBeenCalledTimes(1);

    const { callbacks: c2, onSelected } = callbackSpies();
    pickBackupFile(c2);
    setInputFiles(input, makeFile('{"retry":true}'));
    input.dispatchEvent(new Event("change"));
    await flushMicrotasks();

    expect(onSelected).toHaveBeenCalledWith('{"retry":true}');
  });

  it("a delayed change that arrives after the UI already returned to idle still resolves the newest attempt", async () => {
    // Simulates: focus returns, idle heuristic fires (UI re-enabled), user
    // does nothing further, and only then does the real (delayed) `change`
    // for that same attempt arrive.
    const { callbacks, onCancelled, onSelected } = callbackSpies();
    pickBackupFile(callbacks);
    const input = getSharedInput();

    window.dispatchEvent(new Event("focus"));
    jest.advanceTimersByTime(FOCUS_IDLE_DELAY_MS);
    expect(onCancelled).toHaveBeenCalledTimes(1);

    setInputFiles(input, makeFile('{"stillValid":true}'));
    input.dispatchEvent(new Event("change"));
    await flushMicrotasks();

    expect(onSelected).toHaveBeenCalledWith('{"stillValid":true}');
  });
});

describe("pickBackupFile — errors and duplicate events", () => {
  it("calls onError on a file-read error", async () => {
    const { callbacks, onError } = callbackSpies();
    pickBackupFile(callbacks);
    const input = getSharedInput();
    const brokenFile = new File(["irrelevant"], "backup.json", { type: "application/json" });
    setInputFiles(input, brokenFile);
    input.dispatchEvent(new Event("change"));

    await flushMicrotasks();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "file-read-error" }));
  });

  it("does not call onSelected twice if change fires twice in a row for the same attempt", async () => {
    const { callbacks, onSelected } = callbackSpies();
    pickBackupFile(callbacks);
    const input = getSharedInput();
    setInputFiles(input, makeFile('{"once":true}'));
    input.dispatchEvent(new Event("change"));
    input.dispatchEvent(new Event("change")); // duplicate browser event

    await flushMicrotasks();
    expect(onSelected).toHaveBeenCalledTimes(1);
  });
});
