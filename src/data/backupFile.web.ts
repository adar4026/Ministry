// Web/PWA file I/O for backup export/import (TASK_013).
// Metro resolves this file on web builds; src/data/backupFile.ts is the
// fallback used on native, where this flow isn't implemented yet.

export async function saveBackupFile(filename: string, json: string): Promise<void> {
  const blob = new Blob([json], { type: "application/json" });
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

// Some Safari/iOS versions don't reliably fire <input type=file>'s `cancel`
// event when the native picker is dismissed without a selection. Without a
// fallback, the returned promise would never settle, leaving the caller's
// "picking" state stuck forever. We pair the `cancel` event with a `focus`
// fallback: dismissing the native picker (select OR cancel) always returns
// focus to the window, so on focus we give the `change` event a brief
// window to arrive (it may fire slightly before or after focus, depending
// on the browser) before treating the picker as cancelled.
const FOCUS_FALLBACK_DELAY_MS = 300;

/** Resolves with the picked file's text, or rejects if the user cancels. */
export function pickBackupFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let fileSelected = false; // set synchronously once `change` sees a real file
    let focusTimer: ReturnType<typeof setTimeout> | null = null;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.style.display = "none";

    function cleanup() {
      input.removeEventListener("change", onChange);
      input.removeEventListener("cancel", onCancel);
      window.removeEventListener("focus", onFocus);
      if (focusTimer !== null) {
        clearTimeout(focusTimer);
        focusTimer = null;
      }
      if (input.parentNode) document.body.removeChild(input);
    }

    function settleResolve(value: string) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    }

    function settleReject(err: Error) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    }

    function onChange() {
      const file = input.files && input.files[0];
      if (!file) {
        settleReject(new Error("no-file-selected"));
        return;
      }
      fileSelected = true;
      const reader = new FileReader();
      reader.onload = () => settleResolve(String(reader.result ?? ""));
      reader.onerror = () => settleReject(new Error("file-read-error"));
      reader.readAsText(file);
    }

    function onCancel() {
      // A file was already picked up by `change` (possibly still being
      // read) — a stray/late `cancel` must not override that outcome.
      if (fileSelected) return;
      settleReject(new Error("cancelled"));
    }

    function onFocus() {
      if (focusTimer !== null) return;
      focusTimer = setTimeout(() => {
        focusTimer = null;
        // A file was already picked up by `change` (possibly still being
        // read) — let that path settle the promise instead of racing it.
        if (fileSelected) return;
        settleReject(new Error("cancelled"));
      }, FOCUS_FALLBACK_DELAY_MS);
    }

    input.addEventListener("change", onChange);
    input.addEventListener("cancel", onCancel);
    window.addEventListener("focus", onFocus);

    document.body.appendChild(input);
    input.click();
  });
}

export function reloadApp(): void {
  window.location.reload();
}
