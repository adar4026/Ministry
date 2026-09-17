// TASK_066 — the drawer's compact profile block, fed the same UserProfile
// ProfileHeroCard gets.
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { ProfileSummary } from "@/components/profile/ProfileSummary";
import { MINISTRY } from "@/components/dashboard/tokens";
import type { UserProfile } from "@/types";

function texts(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType("Text" as never)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join("") : n.props.children))
    .filter((t): t is string => typeof t === "string");
}

function flat(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
  return (style ?? {}) as Record<string, unknown>;
}

function render(profile: UserProfile, onPress = jest.fn()) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<ProfileSummary profile={profile} onPress={onPress} />);
  });
  return { renderer, onPress };
}

describe("ProfileSummary", () => {
  it("empty profile → invitation, no preset facts, tap opens the editor", () => {
    const { renderer, onPress } = render({ events: [] });
    const t = texts(renderer);
    expect(t).toContain("Настроить профиль");
    expect(t).toContain("Добавьте имя, фотографию и важные даты");
    expect(t.join(" ").toLowerCase()).not.toMatch(/крещ|пионер|переезд/);
    act(() => {
      renderer.root.findByProps({ testID: "profile-summary" }).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows the name and each user-named event with its DD-MM-YYYY date and elapsed span", () => {
    const { renderer } = render({
      displayName: "  Алекс ",
      events: [
        { id: "a", title: "Крещение", date: "2012-05-13" },
        { id: "b", title: "Пионер", date: "2024-09-01" },
        { id: "c", title: "Последний переезд", date: "2024-05-15" },
      ],
    });
    const t = texts(renderer);
    expect(t).toContain("Алекс");
    expect(t).toContain("Личный профиль");
    expect(t).toContain("Крещение");
    expect(t).toContain("13-05-2012");
    expect(t).toContain("Пионер");
    expect(t).toContain("01-09-2024");
    expect(t).toContain("Последний переезд");
    expect(t).toContain("15-05-2024");
    // One elapsed label per event, in the ProfileHeroCard format ("N г M мес" / "менее 1 мес").
    const elapsed = t.filter((s) => /^(\d+ г( \d+ мес)?|\d+ мес|менее 1 мес)$/.test(s));
    expect(elapsed).toHaveLength(3);
    const rows = renderer.root.findAll((n) => (n.type as unknown) === "View" && typeof n.props.accessibilityLabel === "string" && n.props.accessibilityLabel.startsWith("Событие:"));
    expect(rows).toHaveLength(3);
  });

  it("falls back to 'Мой профиль' when only events exist, and uses the hero inks", () => {
    const { renderer } = render({ events: [{ id: "a", title: "Крещение", date: "2012-05-13" }] });
    expect(texts(renderer)).toContain("Мой профиль");
    const name = renderer.root.findAll((n) => n.props.children === "Мой профиль")[0];
    expect(flat(name.props.style).color).toBe(MINISTRY.ink);
  });

  it("event titles can wrap (2 lines) and the value column never shrinks — long Russian labels are not clipped", () => {
    const { renderer } = render({ events: [{ id: "a", title: "Очень длинное название памятной даты", date: "2020-01-01" }] });
    const title = renderer.root.findAll((n) => n.props.children === "Очень длинное название памятной даты")[0];
    expect(title.props.numberOfLines).toBe(2);
    expect(flat(title.props.style).flex).toBe(1);
    const date = renderer.root.findAll((n) => n.props.children === "01-01-2020")[0];
    expect(flat(date.parent!.props.style).flexShrink).toBe(0);
  });
});
