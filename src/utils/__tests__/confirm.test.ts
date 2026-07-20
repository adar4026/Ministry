// TASK_034 — confirmAsync(): react-native-web's Alert.alert() is a total
// no-op (node_modules/react-native-web/dist/exports/Alert/index.js), so any
// delete flow relying on its destructive onPress never fires on web. This
// pins both branches: native uses the real Alert.alert buttons, web uses
// window.confirm.
import { Alert, Platform } from "react-native";
import { confirmAsync } from "../confirm";

afterEach(() => {
  (Platform as { OS: string }).OS = "ios";
  jest.restoreAllMocks();
});

describe("confirmAsync — native", () => {
  it("resolves true when the destructive button is pressed", async () => {
    (Platform as { OS: string }).OS = "ios";
    const spy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.text === "Удалить")?.onPress?.();
    });
    await expect(confirmAsync("Удалить запись?", "Это действие нельзя отменить.")).resolves.toBe(true);
    expect(spy).toHaveBeenCalled();
  });

  it("resolves false when Отмена is pressed", async () => {
    (Platform as { OS: string }).OS = "ios";
    jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.text === "Отмена")?.onPress?.();
    });
    await expect(confirmAsync("Удалить запись?", "Это действие нельзя отменить.")).resolves.toBe(false);
  });
});

describe("confirmAsync — web", () => {
  it("resolves true when window.confirm returns true, without touching Alert.alert (the no-op on web)", async () => {
    (Platform as { OS: string }).OS = "web";
    const alertSpy = jest.spyOn(Alert, "alert");
    (global as { confirm?: unknown }).confirm = jest.fn(() => true);
    await expect(confirmAsync("Удалить запись?", "Это действие нельзя отменить.")).resolves.toBe(true);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("resolves false when window.confirm returns false", async () => {
    (Platform as { OS: string }).OS = "web";
    (global as { confirm?: unknown }).confirm = jest.fn(() => false);
    await expect(confirmAsync("Удалить запись?", "Это действие нельзя отменить.")).resolves.toBe(false);
  });
});
