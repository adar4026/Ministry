// Web/PWA profile photo picker (TASK_042). Same shared-hidden-<input>,
// change/cancel/focus-heuristic technique as src/data/backupFile.web.ts (see
// that file's comments for the iOS Safari delayed-`change` rationale) —
// reused here rather than re-derived, just reading the file as a data URI
// instead of text. Metro resolves this file on web; src/utils/profilePhoto.ts
// is the native (expo-image-picker) implementation.

export type PickProfilePhotoCallbacks = {
  onSelected: (uri: string) => void;
  onError: (err: Error) => void;
  onCancelled: () => void;
};

const FOCUS_IDLE_DELAY_MS = 300;

type Attempt = {
  callbacks: PickProfilePhotoCallbacks;
  fileSelected: boolean;
  cancelledNotified: boolean;
};

let sharedInput: HTMLInputElement | null = null;
let current: Attempt | null = null;

function ensureInput(): HTMLInputElement {
  if (sharedInput) return sharedInput;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.style.display = "none";

  input.addEventListener("change", () => {
    const attempt = current;
    const file = input.files && input.files[0];
    input.value = "";
    if (!attempt || attempt.fileSelected) return;
    if (!file) {
      attempt.callbacks.onError(new Error("no-file-selected"));
      return;
    }
    attempt.fileSelected = true;
    const reader = new FileReader();
    reader.onload = () => attempt.callbacks.onSelected(String(reader.result ?? ""));
    reader.onerror = () => attempt.callbacks.onError(new Error("file-read-error"));
    reader.readAsDataURL(file);
  });

  input.addEventListener("cancel", () => {
    const attempt = current;
    if (!attempt || attempt.fileSelected || attempt.cancelledNotified) return;
    attempt.cancelledNotified = true;
    attempt.callbacks.onCancelled();
  });

  window.addEventListener("focus", () => {
    const attempt = current;
    if (!attempt) return;
    setTimeout(() => {
      if (current !== attempt || attempt.fileSelected || attempt.cancelledNotified) return;
      attempt.cancelledNotified = true;
      attempt.callbacks.onCancelled();
    }, FOCUS_IDLE_DELAY_MS);
  });

  document.body.appendChild(input);
  sharedInput = input;
  return input;
}

export function pickProfilePhoto(callbacks: PickProfilePhotoCallbacks): void {
  const input = ensureInput();
  current = { callbacks, fileSelected: false, cancelledNotified: false };
  input.click();
}
