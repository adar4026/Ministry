// Web/PWA file I/O for creating and picking backup files (TASK_013).
// Metro resolves this file on web builds; src/data/backupFile.ts is the
// fallback used on native, where this flow isn't implemented yet.

export async function saveBackupFile(
  filename: string,
  json: string,
  // Always `application/json` since TASK_064: the backup IS json, so the type
  // Safari/iOS infers and the extension the app asks for finally agree, and
  // the saved file opens as a known type instead of an unknown "?" document.
  mimeType: string = "application/json",
): Promise<void> {
  const blob = new Blob([json], { type: mimeType });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export type PickBackupFileCallbacks = {
  /** The user picked a file and it was read successfully. */
  onSelected: (text: string) => void;
  /** Terminal failure — file-read-error or (rarely) a `change` with no file. Never fired for a plain cancel. */
  onError: (err: Error) => void;
  /**
   * Best-effort "probably cancelled" cue — fired on an explicit `cancel`
   * event, or heuristically once window focus returns and neither `change`
   * nor `cancel` has arrived yet. This is a UI hint only (safe to stop
   * showing a busy spinner): it never discards the pending pick. Some
   * Safari/iOS versions delay the real `change` event well past focus
   * returning (see backupFile.web.ts history / TASK_013 iOS PWA follow-up),
   * so `onSelected`/`onError` may still fire after `onCancelled` already
   * did, once that delayed event actually arrives.
   */
  onCancelled: () => void;
};

// Heuristic-only: used solely to decide when it's safe to relax the "picking"
// busy indicator in the UI. Never used to reject/discard a selection — see
// `onCancelled` above. Because it carries no correctness weight, its exact
// value doesn't affect whether a genuinely selected file is ever honored.
const FOCUS_IDLE_DELAY_MS = 300;

type Attempt = {
  callbacks: PickBackupFileCallbacks;
  fileSelected: boolean;
  cancelledNotified: boolean;
};

// A single hidden <input> lives for the lifetime of the page and is reused
// across every pick attempt (created lazily on first use). Keeping it alive
// — instead of creating and tearing one down per attempt — means a focus
// heuristic can never destroy the DOM node or detach listeners out from
// under a native file dialog that iOS hasn't finished delivering events for
// yet. `current` tracks whichever pick() call is "live"; only one native
// dialog session is ever in flight against this input at a time.
let sharedInput: HTMLInputElement | null = null;
let current: Attempt | null = null;

function ensureInput(): HTMLInputElement {
  if (sharedInput) return sharedInput;

  const input = document.createElement("input");
  input.type = "file";
  // `.json` is what the app writes (TASK_064). `.mfb` stays listed for the
  // copies TASK_062 already wrote to the owner's device — it has no registered
  // UTI, so iOS exposes it as generic data and `application/octet-stream` is
  // what keeps those files selectable rather than greyed out.
  input.accept = ".json,.mfb,application/json,application/octet-stream";
  input.style.display = "none";

  input.addEventListener("change", () => {
    const attempt = current;
    const file = input.files && input.files[0];
    input.value = ""; // reset immediately so the same file can be picked again next time
    if (!attempt || attempt.fileSelected) return;
    if (!file) {
      attempt.callbacks.onError(new Error("no-file-selected"));
      return;
    }
    attempt.fileSelected = true;
    const reader = new FileReader();
    reader.onload = () => attempt.callbacks.onSelected(String(reader.result ?? ""));
    reader.onerror = () => attempt.callbacks.onError(new Error("file-read-error"));
    reader.readAsText(file);
  });

  input.addEventListener("cancel", () => {
    const attempt = current;
    // A file was already picked up by `change` (possibly still being read)
    // — a stray/late `cancel` must not override that outcome.
    if (!attempt || attempt.fileSelected || attempt.cancelledNotified) return;
    attempt.cancelledNotified = true;
    attempt.callbacks.onCancelled();
  });

  window.addEventListener("focus", () => {
    const attempt = current;
    if (!attempt) return;
    setTimeout(() => {
      // Only a UI cue — does NOT settle/discard `attempt`. If `change`
      // arrives later (even much later), it is still processed above.
      if (current !== attempt || attempt.fileSelected || attempt.cancelledNotified) return;
      attempt.cancelledNotified = true;
      attempt.callbacks.onCancelled();
    }, FOCUS_IDLE_DELAY_MS);
  });

  document.body.appendChild(input);
  sharedInput = input;
  return input;
}

/** Triggers the native file picker; delivers the outcome via `callbacks`. */
export function pickBackupFile(callbacks: PickBackupFileCallbacks): void {
  const input = ensureInput();
  current = { callbacks, fileSelected: false, cancelledNotified: false };
  input.click();
}

export function reloadApp(): void {
  window.location.reload();
}
