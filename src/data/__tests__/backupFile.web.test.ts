/**
 * @jest-environment jsdom
 *
 * pickBackupFile() (TASK_013 Fix 2) needs a real DOM — <input type=file>,
 * window focus events, FileReader — so this suite overrides the project's
 * default (node) jest environment for just this file via the pragma above.
 */
import { pickBackupFile } from "@/data/backupFile.web";

const FOCUS_FALLBACK_DELAY_MS = 300;

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

function interceptCreatedInput(): () => HTMLInputElement {
  const orig = document.createElement.bind(document);
  let captured: HTMLInputElement | null = null;
  jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
    const el = orig(tag);
    if (tag === "input") captured = el as HTMLInputElement;
    return el;
  });
  return () => captured!;
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

describe("pickBackupFile", () => {
  it("resolves with the file's text on successful selection", async () => {
    const getInput = interceptCreatedInput();
    const promise = pickBackupFile();
    const input = getInput();
    setInputFiles(input, makeFile('{"a":1}'));
    input.dispatchEvent(new Event("change"));

    await expect(promise).resolves.toBe('{"a":1}');
    expect(document.body.contains(input)).toBe(false);
  });

  it("rejects on an explicit cancel event", async () => {
    const getInput = interceptCreatedInput();
    const promise = pickBackupFile();
    const input = getInput();
    input.dispatchEvent(new Event("cancel"));

    await expect(promise).rejects.toThrow("cancelled");
    expect(document.body.contains(input)).toBe(false);
  });

  it("rejects via the focus fallback when cancel never fires", async () => {
    const getInput = interceptCreatedInput();
    const promise = pickBackupFile();
    getInput(); // input created and attached; no cancel/change ever arrives

    window.dispatchEvent(new Event("focus"));
    jest.advanceTimersByTime(FOCUS_FALLBACK_DELAY_MS);

    await expect(promise).rejects.toThrow("cancelled");
  });

  it("does not reject via the focus fallback if change arrives shortly after focus", async () => {
    const getInput = interceptCreatedInput();
    const promise = pickBackupFile();
    const input = getInput();

    window.dispatchEvent(new Event("focus"));
    // `change` arrives before the fallback timer elapses.
    setInputFiles(input, makeFile('{"ok":true}'));
    input.dispatchEvent(new Event("change"));

    jest.advanceTimersByTime(FOCUS_FALLBACK_DELAY_MS);

    await expect(promise).resolves.toBe('{"ok":true}');
  });

  it("cleans up the input and listeners after cancellation", async () => {
    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
    const getInput = interceptCreatedInput();
    const promise = pickBackupFile();
    const input = getInput();
    const inputRemoveSpy = jest.spyOn(input, "removeEventListener");

    input.dispatchEvent(new Event("cancel"));
    await expect(promise).rejects.toThrow("cancelled");

    expect(document.body.contains(input)).toBe(false);
    expect(inputRemoveSpy).toHaveBeenCalledWith("change", expect.any(Function));
    expect(inputRemoveSpy).toHaveBeenCalledWith("cancel", expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith("focus", expect.any(Function));
  });

  it("cleans up after a successful selection", async () => {
    const getInput = interceptCreatedInput();
    const promise = pickBackupFile();
    const input = getInput();
    setInputFiles(input, makeFile("{}"));
    input.dispatchEvent(new Event("change"));
    await promise;

    expect(document.body.contains(input)).toBe(false);
  });

  it("cleans up after a file-read error", async () => {
    const getInput = interceptCreatedInput();
    const promise = pickBackupFile();
    const input = getInput();
    // A File whose reader will hit the FakeFileReader's error branch
    // (no __content set).
    const brokenFile = new File(["irrelevant"], "backup.json", { type: "application/json" });
    setInputFiles(input, brokenFile);
    input.dispatchEvent(new Event("change"));

    await expect(promise).rejects.toThrow("file-read-error");
    expect(document.body.contains(input)).toBe(false);
  });

  it("settles only once even if change and cancel both fire", async () => {
    const getInput = interceptCreatedInput();
    const promise = pickBackupFile();
    const input = getInput();
    setInputFiles(input, makeFile('{"first":true}'));
    input.dispatchEvent(new Event("change"));
    input.dispatchEvent(new Event("cancel")); // must be ignored — already settling

    await expect(promise).resolves.toBe('{"first":true}');
  });

  it("does not reject twice when both cancel and the focus fallback occur", async () => {
    const getInput = interceptCreatedInput();
    const promise = pickBackupFile();
    getInput();

    window.dispatchEvent(new Event("focus"));
    // cancel fires (real Safari behavior on some versions) before the
    // fallback timer would have elapsed.
    getInput().dispatchEvent(new Event("cancel"));
    jest.advanceTimersByTime(FOCUS_FALLBACK_DELAY_MS);

    await expect(promise).rejects.toThrow("cancelled");
  });
});
