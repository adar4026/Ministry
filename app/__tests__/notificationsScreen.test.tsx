// TASK_060 — the "Профиль → Уведомления" screen is an information-only
// placeholder (see docs/TASKS/TASK_060_NOTIFICATIONS_STUB_ROLLBACK.md). These
// tests assert both what it shows AND what it must NOT show — the whole
// point of the rollback is that nothing here should look like a working
// feature.
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BackButton } from "@/components/BackButton";
import NotificationsScreen from "../notifications";

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

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <NotificationsScreen />
      </SafeAreaProvider>,
    );
  });
  return renderer;
}

describe("NotificationsScreen — TASK_060 placeholder", () => {
  it("shows the screen title", async () => {
    expect(texts(await renderScreen())).toContain("Уведомления");
  });

  it("shows the card title and the explanatory copy", async () => {
    const t = texts(await renderScreen());
    expect(t).toContain("Уведомления о событиях");
    expect(t).toContain(
      "Здесь можно будет настроить напоминания о предстоящих событиях. Функция появится в будущем.",
    );
  });

  it("shows an inert 'Скоро появится' badge", async () => {
    const renderer = await renderScreen();
    expect(texts(renderer)).toContain("Скоро появится");
    // Inert — not wrapped in anything pressable/interactive.
    const badgeText = renderer.root.findByProps({ children: "Скоро появится" });
    expect(badgeText.props.onPress).toBeUndefined();
  });

  it("has no switches — nothing that looks like a working toggle", async () => {
    const renderer = await renderScreen();
    expect(renderer.root.findAllByProps({ accessibilityRole: "switch" })).toHaveLength(0);
  });

  it("has no test-notification button or permission flow", async () => {
    const t = texts(await renderScreen()).join(" ");
    expect(t).not.toMatch(/Проверить уведомление/);
    expect(t).not.toMatch(/Разрешить уведомления/);
    expect(t).not.toMatch(/Уведомления запрещены/);
    expect(t).not.toMatch(/на экран «Домой»/);
  });

  it("mentions no concrete reminder schedule — 19:00 / 09:00 are gone", async () => {
    const t = texts(await renderScreen()).join(" ");
    expect(t).not.toMatch(/19:00/);
    expect(t).not.toMatch(/09:00/);
    expect(t).not.toMatch(/За день до события|В день события/);
  });

  it("routes the back button to /profile", async () => {
    const renderer = await renderScreen();
    expect(renderer.root.findByType(BackButton).props.fallbackHref).toBe("/profile");
  });
});
