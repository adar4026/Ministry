// TASK_059 — local notification channel, WEB/PWA implementation.
//
// Delivers REAL system notifications (iOS Notification Center / Android
// shade), never an in-app imitation. On iOS `new Notification(...)` is not
// supported at all — the only working path is
// ServiceWorkerRegistration.showNotification(), so the service worker
// (public/ministry-notifications-sw.js) is mandatory here, not an
// optimisation. That worker deliberately has NO `fetch` handler: it never
// caches or intercepts navigation, so it cannot strand the PWA on a stale
// bundle. See docs/TASKS/TASK_059_EVENT_NOTIFICATIONS.md §1 for the full
// platform matrix and the documented iOS limitation.
import type { ScheduledReminder } from "@/data/notifications";

export type NotificationPermissionState = "unsupported" | "default" | "granted" | "denied";

export type NotificationUnsupportedReason = "needs-standalone" | "no-api";

export type NotificationSupport = { supported: true } | { supported: false; reason: NotificationUnsupportedReason };

// Message contract with public/ministry-notifications-sw.js — keep in sync.
const MSG_SYNC = "ministry/sync-reminders";
const MSG_TEST = "ministry/test-notification";

// The worker is served from the app's own base path (`baseUrl: "/Ministry"`,
// app.json). `process.env.EXPO_BASE_URL` is inlined at build time by Expo —
// the same value expo-router itself uses to prefix every route.
const BASE_URL = (process.env.EXPO_BASE_URL || "").replace(/\/+$/, "");
const SW_FILE = "ministry-notifications-sw.js";

type SwLocation = { url: string; scope: string };

const AT_BASE: SwLocation = { url: `${BASE_URL}/${SW_FILE}`, scope: `${BASE_URL}/` };
const AT_ROOT: SwLocation = { url: `/${SW_FILE}`, scope: "/" };

/**
 * Where the worker actually lives, most-likely first.
 *
 * The exported bundle serves public/ under the base path ("/Ministry/…"),
 * but `expo start --web` serves it from the root while still inlining
 * EXPO_BASE_URL — so the build-time constant alone picks the wrong path in
 * one of the two. The page's own pathname is the reliable discriminator: it
 * is under the base path exactly when the assets are too. The other location
 * stays as a fallback so a misconfigured host can't silently kill reminders.
 */
function swLocations(): SwLocation[] {
  if (!BASE_URL) return [AT_ROOT];
  const path = window.location.pathname;
  const underBase = path === BASE_URL || path.startsWith(`${BASE_URL}/`);
  return underBase ? [AT_BASE, AT_ROOT] : [AT_ROOT, AT_BASE];
}

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

function isAppleMobile(): boolean {
  if (!hasWindow()) return false;
  const ua = navigator.userAgent || "";
  // iPadOS 13+ reports a desktop UA; the touch-point check catches it.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
}

function isStandalone(): boolean {
  if (!hasWindow()) return false;
  const legacy = (navigator as unknown as { standalone?: boolean }).standalone;
  if (legacy === true) return true;
  return typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches;
}

export function getNotificationSupport(): NotificationSupport {
  if (!hasWindow()) return { supported: false, reason: "no-api" };
  const hasSW = "serviceWorker" in navigator;
  const hasNotification = typeof window.Notification !== "undefined";
  if (hasSW && hasNotification) return { supported: true };
  // On iOS the API is missing precisely because the app is running in a
  // Safari tab instead of from the Home Screen — that's actionable advice,
  // not a dead end, so it gets its own reason.
  if (isAppleMobile() && !isStandalone()) return { supported: false, reason: "needs-standalone" };
  return { supported: false, reason: "no-api" };
}

export function isNotificationSupported(): boolean {
  return getNotificationSupport().supported;
}

export function getPermissionState(): NotificationPermissionState {
  if (!isNotificationSupported()) return "unsupported";
  const p = window.Notification.permission;
  return p === "granted" || p === "denied" ? p : "default";
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return "unsupported";
  try {
    const result = await window.Notification.requestPermission();
    return result === "granted" || result === "denied" ? result : "default";
  } catch {
    // Older Safari's callback-style requestPermission can reject the
    // promise form; treat as "still undecided" rather than a hard denial.
    return getPermissionState();
  }
}

// One registration per page lifetime — the promise itself is the cache, so
// concurrent callers (store effect + settings screen) share a single
// register() call instead of racing.
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isNotificationSupported()) return null;
  if (!registrationPromise) {
    registrationPromise = (async () => {
      for (const candidate of swLocations()) {
        try {
          await navigator.serviceWorker.register(candidate.url, { scope: candidate.scope });
          const ready = await navigator.serviceWorker.ready;
          await registerPeriodicSync(ready);
          return ready;
        } catch {
          // Try the next location.
        }
      }
      // A failed registration must never break the app; allow a retry on the
      // next call rather than caching the failure forever.
      registrationPromise = null;
      return null;
    })();
  }
  return registrationPromise;
}

// Chrome/Android only, and only if the browser grants it: real background
// delivery while the app is fully closed. Best-effort by design — the
// feature never depends on it (see TASK_059 §1, limitation 4), so every
// failure path here is silent.
const PERIODIC_TAG = "ministry-reminders";

async function registerPeriodicSync(registration: ServiceWorkerRegistration): Promise<void> {
  const periodicSync = (registration as unknown as { periodicSync?: { register: (tag: string, opts: { minInterval: number }) => Promise<void> } })
    .periodicSync;
  if (!periodicSync) return;
  try {
    const permissions = (navigator as unknown as { permissions?: { query: (d: unknown) => Promise<{ state: string }> } }).permissions;
    if (permissions) {
      const status = await permissions.query({ name: "periodic-background-sync" } as unknown as PermissionDescriptor);
      if (status.state !== "granted") return;
    }
    await periodicSync.register(PERIODIC_TAG, { minInterval: 12 * 60 * 60 * 1000 });
  } catch {
    // Unsupported / not granted / already registered — nothing to do.
  }
}

async function post(message: unknown): Promise<void> {
  const registration = await getRegistration();
  const worker = registration?.active ?? navigator.serviceWorker?.controller ?? null;
  worker?.postMessage(message);
}

/**
 * Hands the worker the COMPLETE desired set of pending reminders.
 *
 * Full-set replacement, not incremental add/cancel calls: the worker diffs
 * against what it stored, so a deleted event, a disabled toggle and a flipped
 * master switch are all just "this id is absent" — and a re-sync with an
 * unchanged set is a no-op, which is what makes duplicates impossible.
 */
export async function syncReminders(reminders: ScheduledReminder[]): Promise<void> {
  if (!isNotificationSupported()) return;
  if (getPermissionState() !== "granted") {
    // Without permission the worker can show nothing; clear its schedule so
    // revoked permission doesn't leave a stale set behind for later.
    await post({ type: MSG_SYNC, reminders: [], now: Date.now() });
    return;
  }
  await post({ type: MSG_SYNC, reminders, now: Date.now() });
}

export async function clearAllReminders(): Promise<void> {
  if (!isNotificationSupported()) return;
  await post({ type: MSG_SYNC, reminders: [], now: Date.now() });
}

/** Real system notification a few seconds out, so the owner can verify end to end. */
export async function sendTestNotification(delaySeconds: number): Promise<void> {
  if (!isNotificationSupported()) return;
  await post({ type: MSG_TEST, delayMs: Math.max(0, Math.round(delaySeconds * 1000)) });
}
