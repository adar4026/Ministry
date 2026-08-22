// Non-web fallback for backup export/import (TASK_013).
// The project currently ships web/PWA only (see docs/STATUS.md — native
// build unverified on device); adding native file-picker/share dependencies
// for an unshipped platform is out of scope. Metro falls back to this file
// on native since no .ios.ts/.android.ts/.native.ts variant exists.

export async function saveBackupFile(
  _filename: string,
  _json: string,
  _mimeType?: string,
): Promise<void> {
  throw new Error("platform-unsupported");
}

export type PickBackupFileCallbacks = {
  onSelected: (text: string) => void;
  onError: (err: Error) => void;
  onCancelled: () => void;
};

export function pickBackupFile(callbacks: PickBackupFileCallbacks): void {
  callbacks.onError(new Error("platform-unsupported"));
}

export function reloadApp(): void {
  // No-op: nothing sensible to do on native without an app reload API.
}
