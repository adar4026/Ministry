// TASK_066 — the Profile page and the Home drawer share ONE item list.
import { Alert } from "react-native";
import {
  ABOUT_ITEMS,
  DRAWER_APP_KEYS,
  DRAWER_SERVICE_KEYS,
  SETTINGS_ITEMS,
  activateMenuItem,
  pickMenuItems,
} from "@/components/profile/profileMenu";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));

beforeEach(() => mockPush.mockClear());

describe("profileMenu", () => {
  it("keeps the TASK_044/059 settings rows, in order, with only Уведомления routed", () => {
    expect(SETTINGS_ITEMS.map((i) => i.label)).toEqual([
      "Уведомления", "Цели", "Календарь служения", "Статистика", "Оформление", "Язык",
    ]);
    expect(SETTINGS_ITEMS.filter((i) => i.href).map((i) => [i.label, i.href])).toEqual([["Уведомления", "/notifications"]]);
    expect(ABOUT_ITEMS.map((i) => i.label)).toEqual(["История изменений", "Обратная связь"]);
  });

  it("the drawer's regrouping covers every settings item exactly once", () => {
    const grouped = [...DRAWER_SERVICE_KEYS, ...DRAWER_APP_KEYS];
    expect([...grouped].sort()).toEqual(SETTINGS_ITEMS.map((i) => i.key).sort());
    expect(pickMenuItems(DRAWER_SERVICE_KEYS).map((i) => i.label)).toEqual(["Цели", "Календарь служения", "Статистика"]);
    expect(pickMenuItems(DRAWER_APP_KEYS).map((i) => i.label)).toEqual(["Уведомления", "Оформление", "Язык"]);
    expect(() => pickMenuItems(["nope"])).toThrow(/unknown item key/);
  });

  it("activateMenuItem pushes the route or shows the shared placeholder", () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    activateMenuItem(SETTINGS_ITEMS[0]);
    expect(mockPush).toHaveBeenCalledWith("/notifications");
    activateMenuItem(SETTINGS_ITEMS[1]);
    expect(alert).toHaveBeenCalledWith("Цели", "Появится позже");
    alert.mockRestore();
  });
});
