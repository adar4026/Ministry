// TASK_059 — local notification channel, NATIVE/default resolution.
//
// Same platform-split pattern as src/utils/profilePhotoStorage.ts/.web.ts and
// src/data/backupFile.ts/.web.ts: Metro picks `.web.ts` on web builds, this
// file everywhere else (including jest-expo, whose default platform is ios).
//
// Ministry currently ships as a web/PWA bundle only (`npm run deploy` =
// `expo export --platform web` + gh-pages) — there is no native build, so
// this is an honest no-op rather than an expo-notifications wrapper for a
// target that does not exist. See docs/TASKS/TASK_059_EVENT_NOTIFICATIONS.md
// §1: if the project ever moves to EAS Build, this file is the one place
// that grows an expo-notifications implementation, and nothing else changes.
import type { ScheduledReminder } from "@/data/notifications";

export type NotificationPermissionState = "unsupported" | "default" | "granted" | "denied";

export type NotificationUnsupportedReason =
  // iOS: the Notification API only exists for a web app launched from the
  // Home Screen, never in a plain Safari tab.
  | "needs-standalone"
  // No Notification/ServiceWorker API at all (native runtime, old browser).
  | "no-api";

export type NotificationSupport = { supported: true } | { supported: false; reason: NotificationUnsupportedReason };

export function getNotificationSupport(): NotificationSupport {
  return { supported: false, reason: "no-api" };
}

export function isNotificationSupported(): boolean {
  return false;
}

export function getPermissionState(): NotificationPermissionState {
  return "unsupported";
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  return "unsupported";
}

export async function syncReminders(_reminders: ScheduledReminder[]): Promise<void> {
  // No-op: nothing to schedule on a runtime with no notification channel.
}

export async function clearAllReminders(): Promise<void> {
  // No-op — see syncReminders above.
}

export async function sendTestNotification(_delaySeconds: number): Promise<void> {
  // No-op — see syncReminders above.
}
