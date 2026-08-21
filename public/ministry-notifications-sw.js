/*
 * Ministry — local event-reminder service worker (TASK_059).
 *
 * Scope of responsibility, deliberately narrow:
 *   - hold the pending reminder schedule in IndexedDB (survives the worker
 *     being unloaded and the app being restarted);
 *   - show real system notifications for reminders that come due.
 *
 * There is intentionally NO `fetch` handler. This worker never caches and
 * never intercepts navigation, so it cannot strand the installed PWA on a
 * stale bundle — a class of failure that is otherwise the main risk of
 * adding a service worker to an already-deployed web app.
 *
 * Delivery guarantees are platform-limited and documented in
 * docs/TASKS/TASK_059_EVENT_NOTIFICATIONS.md §1. In short: no browser ships
 * a timestamp trigger, and Ministry has no push server by design (ADR-002 —
 * data never leaves the device), so on iOS a reminder fires while the app is
 * open or in the background, and otherwise is caught up at next launch.
 */

const DB_NAME = "ministry-notifications";
const DB_VERSION = 1;
const STORE = "state";
const STATE_KEY = "reminders";
const PERIODIC_TAG = "ministry-reminders";

// Timers are only armed for reminders inside this window. A setTimeout weeks
// out would be pointless — the worker never lives that long — and the
// catch-up pass covers anything the timer never got to run.
const TIMER_WINDOW_MS = 24 * 60 * 60 * 1000;

const APP_URL = new URL("./", self.registration.scope).href;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

/* ------------------------------------------------------------------ *
 * IndexedDB — a single record: { reminders: [...], delivered: [ids] }
 * ------------------------------------------------------------------ */

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readState() {
  try {
    const db = await openDB();
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(STATE_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!value || !Array.isArray(value.reminders)) return { reminders: [], delivered: [] };
    return { reminders: value.reminders, delivered: Array.isArray(value.delivered) ? value.delivered : [] };
  } catch {
    return { reminders: [], delivered: [] };
  }
}

async function writeState(state) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(state, STATE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Storage unavailable (private mode, quota): the in-memory timers armed
    // for this session still work; nothing else we can do.
  }
}

/* ------------------------------------------------------------------ *
 * Showing
 * ------------------------------------------------------------------ */

function show(reminder) {
  return self.registration.showNotification(reminder.title, {
    body: reminder.body,
    // The reminder's own deterministic id (`<eventId>::<kind>`). If a show
    // command ever reaches the OS twice, it collapses them into one banner —
    // a second layer of duplicate protection on top of the ids themselves.
    tag: reminder.id,
    renotify: false,
    icon: `${APP_URL}apple-touch-icon.png`,
    badge: `${APP_URL}apple-touch-icon.png`,
    data: { url: APP_URL, reminderId: reminder.id },
  });
}

/* ------------------------------------------------------------------ *
 * The one routine every wake-up runs
 * ------------------------------------------------------------------ */

let timers = [];

function clearTimers() {
  for (const t of timers) clearTimeout(t);
  timers = [];
}

/**
 * @param incoming full desired set from the page, or null when this wake-up
 *                 brought no new set (a fired timer / periodicsync).
 */
async function reconcile(incoming) {
  const now = Date.now();
  const state = await readState();
  const delivered = new Set(state.delivered);

  // 1. Catch-up FIRST, before any reconciliation. A reminder whose slot fell
  //    due while the app was closed is no longer in the page's plan (that
  //    only ever contains future reminders), so reconciling first would drop
  //    it silently instead of delivering it.
  for (const reminder of state.reminders) {
    if (reminder.fireAt <= now && !delivered.has(reminder.id)) {
      delivered.add(reminder.id);
      try {
        await show(reminder);
      } catch {
        // Permission revoked mid-flight — stay marked delivered rather than
        // re-showing on every wake-up.
      }
    }
  }

  // 2. Reconcile against the new desired set, carrying delivered flags over
  //    by id. Anything absent from `incoming` (deleted event, disabled
  //    toggle, master switch off) simply disappears along with its timer.
  const next = incoming ?? state.reminders.filter((r) => r.fireAt > now);
  const nextIds = new Set(next.map((r) => r.id));
  const nextDelivered = [...delivered].filter((id) => nextIds.has(id));

  await writeState({ reminders: next, delivered: nextDelivered });

  // 3. Re-arm timers for whatever is now pending and near enough to matter.
  clearTimers();
  const deliveredNow = new Set(nextDelivered);
  for (const reminder of next) {
    if (deliveredNow.has(reminder.id)) continue;
    const delay = reminder.fireAt - now;
    if (delay <= 0 || delay > TIMER_WINDOW_MS) continue;
    timers.push(setTimeout(() => reconcile(null), delay + 500));
  }
}

/* ------------------------------------------------------------------ *
 * Wake-up sources
 * ------------------------------------------------------------------ */

self.addEventListener("message", (event) => {
  const data = event.data || {};

  if (data.type === "ministry/sync-reminders") {
    const reminders = Array.isArray(data.reminders) ? data.reminders : [];
    event.waitUntil(reconcile(reminders));
    return;
  }

  if (data.type === "ministry/test-notification") {
    const delay = typeof data.delayMs === "number" ? data.delayMs : 5000;
    event.waitUntil(
      new Promise((resolve) => {
        setTimeout(() => {
          self.registration
            .showNotification("Проверка уведомлений", {
              body: "Ministry напомнит о приближающихся событиях.",
              tag: "ministry-test",
              icon: `${APP_URL}apple-touch-icon.png`,
              badge: `${APP_URL}apple-touch-icon.png`,
              data: { url: APP_URL },
            })
            .then(resolve, resolve);
        }, delay);
      }),
    );
  }
});

// Chrome/Android only, and only when the browser chooses to grant it — real
// background delivery with the app fully closed. Treated as a bonus, never
// as the mechanism the feature depends on.
self.addEventListener("periodicsync", (event) => {
  if (event.tag === PERIODIC_TAG) event.waitUntil(reconcile(null));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || APP_URL;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(APP_URL) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
    }),
  );
});
