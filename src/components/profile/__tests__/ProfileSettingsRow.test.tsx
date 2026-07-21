// TASK_044 — shared settings-list row for the redesigned Profile page.
import { act, create } from "react-test-renderer";
import { Text } from "react-native";
import { BellIcon } from "@/components/icons";
import { ProfileSettingsRow } from "../ProfileSettingsRow";

function texts(renderer: ReturnType<typeof create>): string[] {
  return renderer.root
    .findAllByType(Text)
    .map((n) => n.props.children)
    .filter((c): c is string => typeof c === "string");
}

describe("ProfileSettingsRow", () => {
  it("shows the title and, when given, the subtitle", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileSettingsRow title="Резервная копия" subtitle="Создать или восстановить копию данных" />);
    });
    expect(texts(renderer)).toEqual(expect.arrayContaining(["Резервная копия", "Создать или восстановить копию данных"]));
  });

  it("shows a chevron (and a Pressable) only when onPress is given and there is no value/busy", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileSettingsRow title="Уведомления" onPress={() => {}} />);
    });
    expect(renderer.root.findByProps({ accessibilityRole: "button" })).toBeTruthy();
  });

  it("shows the value text instead of a chevron when value is given, and is not pressable", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileSettingsRow title="Версия приложения" value="0.4.4" />);
    });
    expect(texts(renderer)).toContain("0.4.4");
    expect(renderer.root.findAllByProps({ accessibilityRole: "button" }).length).toBe(0);
  });

  it("shows a spinner instead of the chevron while busy", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileSettingsRow title="Экспорт данных" onPress={() => {}} busy />);
    });
    expect(renderer.root.findAllByType("ActivityIndicator" as never)).toHaveLength(1);
  });

  it("forwards disabled to the underlying Pressable", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileSettingsRow title="Экспорт данных" onPress={() => {}} disabled />);
    });
    const button = renderer.root.findByProps({ accessibilityRole: "button" });
    expect(button.props.disabled).toBe(true);
  });

  it("is not pressable when onPress is omitted", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileSettingsRow title="Синхронизация" subtitle="Скоро — через A-Lex Core" />);
    });
    expect(renderer.root.findAllByProps({ accessibilityRole: "button" })).toHaveLength(0);
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileSettingsRow title="Цели" onPress={onPress} />);
    });
    act(() => {
      renderer.root.findByProps({ accessibilityRole: "button" }).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("uses an explicit accessibilityLabel override instead of the composed one", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <ProfileSettingsRow
          title="Экспорт данных"
          subtitle="Сохранить копию данных приложения"
          onPress={() => {}}
          accessibilityLabel="Экспортировать данные"
        />,
      );
    });
    expect(renderer.root.findByProps({ accessibilityRole: "button" }).props.accessibilityLabel).toBe(
      "Экспортировать данные",
    );
  });

  it("renders the given icon", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileSettingsRow title="Уведомления" icon={BellIcon} />);
    });
    expect(renderer.root.findAllByType(BellIcon)).toHaveLength(1);
  });
});
