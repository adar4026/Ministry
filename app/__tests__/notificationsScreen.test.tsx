// TASK_059 — the "Профиль → Уведомления" screen.
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StoreProvider } from "@/store/StoreContext";
import NotificationsScreen from "../notifications";

jest.setTimeout(30000);

const channel = {
  supported: { supported: true } as { supported: boolean; reason?: string },
  permission: "granted" as string,
  requested: "granted" as string,
};

jest.mock("@/utils/localNotifications", () => ({
  isNotificationSupported: () => channel.supported.supported,
  getNotificationSupport: () => channel.supported,
  getPermissionState: () => channel.permission,
  requestNotificationPermission: jest.fn(async () => {
    channel.permission = channel.requested;
    return channel.requested;
  }),
  sendTestNotification: jest.fn(async () => {}),
  syncReminders: jest.fn(async () => {}),
  clearAllReminders: jest.fn(async () => {}),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mocked = require("@/utils/localNotifications") as {
  requestNotificationPermission: jest.Mock;
  sendTestNotification: jest.Mock;
};

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function texts(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType("Text" as never)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join("") : n.props.children))
    .filter((t): t is string => typeof t === "string");
}

/** The switch rows, in render order: master, day-before, same-day. */
function switches(renderer: ReactTestRenderer) {
  return renderer.root.findAll((n) => n.props?.accessibilityRole === "switch" && typeof n.props?.onPress === "function");
}

function rowByLabel(renderer: ReactTestRenderer, label: string) {
  return renderer.root.find(
    (n) => n.props?.accessibilityRole === "button" && String(n.props?.accessibilityLabel ?? "").startsWith(label),
  );
}

// Tracked so afterEach can unmount: StoreProvider's reminder-refresh effect
// arms a setInterval whenever the channel reports the platform as supported
// (which this suite's mock does), and only unmounting runs its cleanup —
// otherwise the interval outlives the suite and jest never exits.
let mounted: ReactTestRenderer | null = null;

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <StoreProvider>
          <NotificationsScreen />
        </StoreProvider>
      </SafeAreaProvider>,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  mounted = renderer;
  return renderer;
}

afterEach(async () => {
  if (mounted) await act(async () => mounted!.unmount());
  mounted = null;
});

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  channel.supported = { supported: true };
  channel.permission = "granted";
  channel.requested = "granted";
});

describe("NotificationsScreen — TASK_059 layout", () => {
  it("shows the title, the explanation and both reminder rows", async () => {
    const t = texts(await renderScreen());
    expect(t).toContain("Уведомления");
    expect(t.join(" ")).toMatch(/напомнит о приближающихся событиях/i);
    expect(t).toContain("Уведомления о событиях");
    expect(t).toContain("За день до события");
    expect(t).toContain("В день события");
  });

  it("labels the two slots with their fixed times", async () => {
    const t = texts(await renderScreen());
    expect(t).toContain("В 19:00");
    expect(t).toContain("В 09:00");
  });

  it("offers the test-notification row", async () => {
    expect(texts(await renderScreen())).toContain("Проверить уведомление");
  });

  it("shows no permission notice once permission is granted", async () => {
    const t = texts(await renderScreen()).join(" ");
    expect(t).not.toMatch(/Нужно разрешение|Уведомления запрещены|на экран «Домой»/);
  });
});

describe("NotificationsScreen — switches", () => {
  it("starts with the master switch off and both sub-switches disabled", async () => {
    const renderer = await renderScreen();
    const [master, dayBefore, sameDay] = switches(renderer);
    expect(master.props.accessibilityState.checked).toBe(false);
    expect(dayBefore.props.accessibilityState.disabled).toBe(true);
    expect(sameDay.props.accessibilityState.disabled).toBe(true);
  });

  it("enables the sub-switches once the master switch is on", async () => {
    const renderer = await renderScreen();
    await act(async () => {
      switches(renderer)[0].props.onPress();
      await Promise.resolve();
    });
    const [master, dayBefore, sameDay] = switches(renderer);
    expect(master.props.accessibilityState.checked).toBe(true);
    expect(dayBefore.props.accessibilityState.disabled).toBe(false);
    expect(sameDay.props.accessibilityState.disabled).toBe(false);
  });

  it("toggles each kind independently, without touching the other", async () => {
    const renderer = await renderScreen();
    await act(async () => {
      switches(renderer)[0].props.onPress();
      await Promise.resolve();
    });
    await act(async () => {
      switches(renderer)[1].props.onPress(); // turn "day before" off
      await Promise.resolve();
    });
    const [, dayBefore, sameDay] = switches(renderer);
    expect(dayBefore.props.accessibilityState.checked).toBe(false);
    expect(sameDay.props.accessibilityState.checked).toBe(true);
  });

  it("turning the master switch back off leaves the sub-switch choices intact", async () => {
    const renderer = await renderScreen();
    await act(async () => {
      switches(renderer)[0].props.onPress();
      await Promise.resolve();
    });
    await act(async () => {
      switches(renderer)[1].props.onPress();
      await Promise.resolve();
    });
    await act(async () => {
      switches(renderer)[0].props.onPress(); // master off
      await Promise.resolve();
    });
    const [master, dayBefore] = switches(renderer);
    expect(master.props.accessibilityState.checked).toBe(false);
    expect(dayBefore.props.accessibilityState.checked).toBe(false);
  });

  it("persists the master switch through the store", async () => {
    const renderer = await renderScreen();
    await act(async () => {
      switches(renderer)[0].props.onPress();
      await Promise.resolve();
    });
    expect(JSON.parse((await AsyncStorage.getItem("mj_notifications_v1"))!).enabled).toBe(true);
  });
});

describe("NotificationsScreen — permission", () => {
  it("asks for permission when the master switch is turned on", async () => {
    channel.permission = "default";
    const renderer = await renderScreen();
    await act(async () => {
      switches(renderer)[0].props.onPress();
      await Promise.resolve();
    });
    expect(mocked.requestNotificationPermission).toHaveBeenCalledTimes(1);
    expect(switches(renderer)[0].props.accessibilityState.checked).toBe(true);
  });

  it("leaves the master switch off when permission is refused", async () => {
    channel.permission = "default";
    channel.requested = "denied";
    const renderer = await renderScreen();
    await act(async () => {
      switches(renderer)[0].props.onPress();
      await Promise.resolve();
    });
    expect(switches(renderer)[0].props.accessibilityState.checked).toBe(false);
    expect(JSON.parse((await AsyncStorage.getItem("mj_notifications_v1"))!).enabled).toBe(false);
  });

  it("explains the situation and offers a request button while permission is undecided", async () => {
    channel.permission = "default";
    const t = texts(await renderScreen());
    expect(t).toContain("Нужно разрешение");
    expect(t).toContain("Разрешить уведомления");
  });

  it("points at system settings — with no dead-end button — once permission is denied", async () => {
    channel.permission = "denied";
    const t = texts(await renderScreen());
    expect(t).toContain("Уведомления запрещены");
    expect(t).not.toContain("Разрешить уведомления");
    expect(t.join(" ")).toMatch(/Настройки/);
  });

  it("tells the user to install the PWA when iOS has no Notification API in a tab", async () => {
    channel.supported = { supported: false, reason: "needs-standalone" };
    channel.permission = "unsupported";
    const renderer = await renderScreen();
    expect(texts(renderer)).toContain("Добавьте Ministry на экран «Домой»");
    expect(switches(renderer)[0].props.accessibilityState.disabled).toBe(true);
  });

  it("explains an unsupported browser", async () => {
    channel.supported = { supported: false, reason: "no-api" };
    channel.permission = "unsupported";
    expect(texts(await renderScreen())).toContain("Уведомления недоступны");
  });
});

describe("NotificationsScreen — test notification", () => {
  it("sends a real system notification a few seconds out", async () => {
    const renderer = await renderScreen();
    await act(async () => {
      rowByLabel(renderer, "Проверить уведомление").props.onPress();
      await Promise.resolve();
    });
    expect(mocked.sendTestNotification).toHaveBeenCalledWith(5);
    expect(texts(renderer).join(" ")).toMatch(/Отправлено/);
  });

  it("disables the test row while permission is not granted", async () => {
    channel.permission = "default";
    const renderer = await renderScreen();
    expect(rowByLabel(renderer, "Проверить уведомление").props.accessibilityState.disabled).toBe(true);
  });
});
