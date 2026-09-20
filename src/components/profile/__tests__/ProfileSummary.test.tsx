// TASK_066 — the drawer's compact profile block, fed the same UserProfile
// ProfileHeroCard gets.
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { ProfileSummary } from "@/components/profile/ProfileSummary";
import { DRAWER_ICE, MINISTRY } from "@/components/dashboard/tokens";
import { ChevronRightIcon } from "@/components/icons";
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

  it("falls back to 'Мой профиль' when only events exist, and uses the drawer's cool inks (TASK_077)", () => {
    const { renderer } = render({ events: [{ id: "a", title: "Крещение", date: "2012-05-13" }] });
    expect(texts(renderer)).toContain("Мой профиль");
    const name = renderer.root.findAll((n) => n.props.children === "Мой профиль")[0];
    const ns = flat(name.props.style);
    expect(ns.color).toBe(DRAWER_ICE.ink);
    // Finance `.dh-name` 17/700 and `.dh-sub` 13/500 muted.
    expect(ns.fontWeight).toBe("700");
    expect(ns.fontSize).toBe(17);
    const sub = renderer.root.findAll((n) => n.props.children === "Личный профиль")[0];
    expect(flat(sub.props.style).color).toBe(DRAWER_ICE.ink2);
    expect(flat(sub.props.style).fontSize).toBe(13);
    // Finance's drawer-head: the row ends in a chevron (the block is a button).
    const chevron = renderer.root.findByProps({ testID: "profile-summary-chevron" });
    expect(chevron.props.importantForAccessibility).toBe("no");
    expect(chevron.findAllByType(ChevronRightIcon)).toHaveLength(1);
    expect(chevron.findAllByType(ChevronRightIcon)[0].props.color).toBe(DRAWER_ICE.chevron);
  });

  // TASK_072 — the dates read as milestones: hairline-separated rows, title
  // as typed (no uppercase), date the main fact, the elapsed span quieter.
  // TASK_077 — and NOT a card: no fill, no border, no radius, no shadow —
  // the rows sit straight on the drawer's ice-blue ground.
  it("renders the events as plain milestone rows on the drawer ground: no card, hairlines between rows only, teal marker per row", () => {
    const { renderer } = render({
      displayName: "Alex",
      events: [
        { id: "a", title: "Крещение", date: "1992-04-12" },
        { id: "b", title: "Пионер", date: "2016-03-01" },
        { id: "c", title: "Хихон", date: "2024-05-15" },
      ],
    });
    const block = renderer.root.findByProps({ testID: "profile-summary-events" });
    const bs = flat(block.props.style);
    expect(bs.backgroundColor).toBeUndefined();
    expect(bs.borderWidth).toBeUndefined();
    expect(bs.borderColor).toBeUndefined();
    expect(bs.borderRadius).toBeUndefined();
    expect(bs.shadowOpacity).toBeUndefined();
    expect(bs.elevation).toBeUndefined();
    const rows = renderer.root.findAll((n) => (n.type as unknown) === "View" && typeof n.props.accessibilityLabel === "string" && n.props.accessibilityLabel.startsWith("Событие:"));
    expect(rows).toHaveLength(3);
    // Hairlines only BETWEEN rows (above the 2nd and 3rd), never a perimeter.
    const withDivider = rows.map((r) => flat(r.props.style).borderTopWidth !== undefined);
    expect(withDivider).toEqual([false, true, true]);
    for (const r of rows) {
      const rs = flat(r.props.style);
      expect(rs.borderWidth).toBeUndefined();
      expect(rs.borderBottomWidth).toBeUndefined();
      expect(rs.backgroundColor).toBeUndefined();
      expect(rs.paddingVertical as number).toBeGreaterThanOrEqual(12);
    }
    for (const r of rows) {
      const marker = r.findAll((n) => (n.type as unknown) === "View" && flat(n.props.style).backgroundColor === MINISTRY.accent);
      expect(marker).toHaveLength(1);
      expect(flat(marker[0].props.style).borderRadius).toBe(flat(marker[0].props.style).width as number / 2);
    }
  });

  it("titles are shown as typed (no uppercase), the date is the main fact in ink and the elapsed span is the quieter grey-blue line", () => {
    const { renderer } = render({ events: [{ id: "a", title: "Крещение", date: "1992-04-12" }] });
    const title = renderer.root.findAll((n) => n.props.children === "Крещение")[0];
    const ts = flat(title.props.style);
    expect(ts.textTransform).toBeUndefined();
    expect(ts.color).toBe(DRAWER_ICE.ink);
    expect(ts.fontSize).toBeGreaterThanOrEqual(14);
    expect(["500", "600"]).toContain(ts.fontWeight);
    const date = renderer.root.findAll((n) => n.props.children === "12-04-1992")[0];
    const ds = flat(date.props.style);
    expect(ds.color).toBe(DRAWER_ICE.ink);
    expect(ds.fontWeight).toBe("700");
    expect(ds.fontSize).toBeGreaterThanOrEqual(ts.fontSize as number);
    const elapsed = renderer.root.findAll((n) => typeof n.props.children === "string" && /^\d+ г( \d+ мес)?$/.test(n.props.children))[0];
    const es = flat(elapsed.props.style);
    // TASK_077 — secondary text, not the brand teal (the marker dot is the
    // only teal left in the block).
    expect(es.color).toBe(DRAWER_ICE.ink2);
    expect(es.fontSize).toBeLessThan(ds.fontSize as number);
  });

  it("reserves headTrailingSpace on the name row only — the milestones block below is not indented", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <ProfileSummary
          profile={{ displayName: "Alex", events: [{ id: "a", title: "Крещение", date: "1992-04-12" }] }}
          onPress={jest.fn()}
          headTrailingSpace={50}
        />,
      );
    });
    const name = renderer.root.findAll((n) => n.props.children === "Alex")[0];
    // Walk up to the head row: it carries the paddingRight.
    let node = name.parent;
    while (node && flat(node.props.style).paddingRight === undefined) node = node.parent;
    expect(node && flat(node.props.style).paddingRight).toBe(50);
    const block = renderer.root.findByProps({ testID: "profile-summary-events" });
    expect(flat(block.props.style).paddingRight).toBeUndefined();
    expect(flat(block.props.style).marginRight).toBeUndefined();
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
