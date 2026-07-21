/**
 * @jest-environment jsdom
 *
 * pickProfilePhoto() (TASK_042) reuses backupFile.web.ts's shared-<input>,
 * change/cancel/focus-heuristic technique verbatim (see that file's suite
 * for the full iOS Safari delayed-`change` rationale) — this suite covers
 * the same core behaviors against the photo-specific implementation:
 * data-URI delivery via readAsDataURL, image-only accept, and that a
 * genuine selection is never discarded by the focus-idle cancel heuristic.
 */
import { pickProfilePhoto, type PickProfilePhotoCallbacks } from "@/utils/profilePhoto.web";

const FOCUS_IDLE_DELAY_MS = 300;

class FakeFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL(file: File & { __dataUrl?: string }) {
    Promise.resolve().then(() => {
      if (file.__dataUrl === undefined) {
        this.onerror?.();
        return;
      }
      this.result = file.__dataUrl;
      this.onload?.();
    });
  }
}

function makePhotoFile(dataUrl: string, name = "photo.jpg"): File & { __dataUrl: string } {
  const file = new File(["irrelevant"], name, { type: "image/jpeg" }) as File & { __dataUrl: string };
  file.__dataUrl = dataUrl;
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
  const callbacks: PickProfilePhotoCallbacks = { onSelected, onError, onCancelled };
  return { callbacks, onSelected, onError, onCancelled };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

function getSharedInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]');
  if (!input) throw new Error("shared input not found — call pickProfilePhoto() first");
  return input as HTMLInputElement;
}

let originalFileReader: typeof FileReader;

beforeEach(() => {
  jest.useFakeTimers();
  originalFileReader = global.FileReader;
  (global as unknown as { FileReader: unknown }).FileReader = FakeFileReader;
});

afterEach(() => {
  jest.useRealTimers();
  (global as unknown as { FileReader: unknown }).FileReader = originalFileReader;
});

describe("pickProfilePhoto — success", () => {
  it("delivers the picked image as a data URI via onSelected", async () => {
    const { callbacks, onSelected } = callbackSpies();
    pickProfilePhoto(callbacks);
    const input = getSharedInput();
    expect(input.accept).toBe("image/*");
    setInputFiles(input, makePhotoFile("data:image/jpeg;base64,AAA="));
    input.dispatchEvent(new Event("change"));

    await flushMicrotasks();
    expect(onSelected).toHaveBeenCalledWith("data:image/jpeg;base64,AAA=");
  });

  it("resets input.value after handling so the same photo can be picked again", async () => {
    const { callbacks } = callbackSpies();
    pickProfilePhoto(callbacks);
    const input = getSharedInput();
    setInputFiles(input, makePhotoFile("data:image/jpeg;base64,BBB="));
    input.dispatchEvent(new Event("change"));
    await flushMicrotasks();
    expect(input.value).toBe("");
  });

  it("reuses the same shared input across repeated picks", async () => {
    const { callbacks: c1 } = callbackSpies();
    pickProfilePhoto(c1);
    const input1 = getSharedInput();

    const { callbacks: c2 } = callbackSpies();
    pickProfilePhoto(c2);
    const input2 = getSharedInput();

    expect(input2).toBe(input1);
    expect(document.querySelectorAll('input[type="file"]').length).toBe(1);
  });
});

describe("pickProfilePhoto — cancellation", () => {
  it("calls onCancelled on an explicit cancel event", async () => {
    const { callbacks, onCancelled, onError } = callbackSpies();
    pickProfilePhoto(callbacks);
    const input = getSharedInput();
    input.dispatchEvent(new Event("cancel"));

    expect(onCancelled).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("calls onCancelled via the focus-idle heuristic when neither change nor cancel fires", async () => {
    const { callbacks, onCancelled } = callbackSpies();
    pickProfilePhoto(callbacks);
    getSharedInput();

    window.dispatchEvent(new Event("focus"));
    jest.advanceTimersByTime(FOCUS_IDLE_DELAY_MS);

    expect(onCancelled).toHaveBeenCalledTimes(1);
  });

  it("still delivers a delayed selection after the focus-idle heuristic already fired onCancelled", async () => {
    const { callbacks, onSelected, onCancelled } = callbackSpies();
    pickProfilePhoto(callbacks);
    const input = getSharedInput();

    window.dispatchEvent(new Event("focus"));
    jest.advanceTimersByTime(FOCUS_IDLE_DELAY_MS + 1);
    expect(onCancelled).toHaveBeenCalledTimes(1);

    setInputFiles(input, makePhotoFile("data:image/jpeg;base64,DELAYED="));
    input.dispatchEvent(new Event("change"));
    await flushMicrotasks();

    expect(onSelected).toHaveBeenCalledWith("data:image/jpeg;base64,DELAYED=");
  });

  it("a stray cancel after a photo was already picked up does not fire onCancelled", async () => {
    const { callbacks, onSelected, onCancelled } = callbackSpies();
    pickProfilePhoto(callbacks);
    const input = getSharedInput();
    setInputFiles(input, makePhotoFile("data:image/jpeg;base64,X="));
    input.dispatchEvent(new Event("change"));
    input.dispatchEvent(new Event("cancel"));

    await flushMicrotasks();
    expect(onSelected).toHaveBeenCalledWith("data:image/jpeg;base64,X=");
    expect(onCancelled).not.toHaveBeenCalled();
  });
});

describe("pickProfilePhoto — errors", () => {
  it("calls onError on a file-read error", async () => {
    const { callbacks, onError } = callbackSpies();
    pickProfilePhoto(callbacks);
    const input = getSharedInput();
    const brokenFile = new File(["irrelevant"], "photo.jpg", { type: "image/jpeg" });
    setInputFiles(input, brokenFile);
    input.dispatchEvent(new Event("change"));

    await flushMicrotasks();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "file-read-error" }));
  });

  it("calls onError with no-file-selected when change fires with an empty file list", async () => {
    const { callbacks, onError } = callbackSpies();
    pickProfilePhoto(callbacks);
    const input = getSharedInput();
    setInputFiles(input, null);
    input.dispatchEvent(new Event("change"));

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "no-file-selected" }));
  });
});
