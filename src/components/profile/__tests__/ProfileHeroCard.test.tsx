// TASK_076 — Profile hero card, redesigned after the owner's LexMoney
// reference screenshot: avatar + name header, followed by plain
// label-left/value-right ROWS on one ice-blue surface (no columns, no
// uppercase labels, no per-row cards). Key requirements under test: the card
// must never invent preset "Крещение"/"Пионер" entries (every event comes
// directly from the profile prop), the empty state renders with zero events,
// and at most 3 events render as stacked rows in array order.
import { act, create } from "react-test-renderer";
import { ProfileHeroCard } from "../ProfileHeroCard";
import type { UserProfile } from "@/types";

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return { events: [], ...overrides };
}

function renderCard(p: UserProfile, onPress = jest.fn(), onInvalidPhoto = jest.fn()) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<ProfileHeroCard profile={p} onPress={onPress} onInvalidPhoto={onInvalidPhoto} />);
  });
  return renderer;
}

function findTexts(renderer: ReturnType<typeof create>): string[] {
  return renderer.root
    .findAllByType("Text" as never)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join("") : n.props.children))
    .filter((t): t is string => typeof t === "string");
}

describe("ProfileHeroCard — empty state", () => {
  it("shows the empty-state invitation, no preset facts", () => {
    const renderer = renderCard(profile());
    const texts = findTexts(renderer);
    expect(texts).toEqual(
      expect.arrayContaining(["Настроить профиль", "Добавьте имя, фотографию и важные даты", "+ Добавить данные"]),
    );
  });

  it("never shows Крещение/Пионер/Переезд or any preset event on first run", () => {
    const renderer = renderCard(profile());
    const texts = findTexts(renderer).join(" ").toLowerCase();
    expect(texts).not.toContain("крещен");
    expect(texts).not.toContain("пионер");
    expect(texts).not.toContain("переезд");
  });

  it("is empty only when there is no name, no photo, and no events", () => {
    const renderer = renderCard(profile({ displayName: "Александр" }));
    const texts = findTexts(renderer);
    expect(texts).not.toContain("Настроить профиль");
  });

  it("the whole card is a single pressable that opens the editor", () => {
    const onPress = jest.fn();
    const renderer = renderCard(profile(), onPress);
    act(() => {
      renderer.root.findByProps({ accessibilityRole: "button" }).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("ProfileHeroCard — filled header", () => {
  it("shows the name as the large primary line when set", () => {
    const renderer = renderCard(profile({ displayName: "Александр" }));
    expect(findTexts(renderer)).toContain("Александр");
  });

  it("falls back to 'Мой профиль' as the primary line when no name is set but data exists", () => {
    const renderer = renderCard(profile({ events: [{ id: "e1", title: "Переезд", date: "2024-03-12" }] }));
    expect(findTexts(renderer)).toContain("Мой профиль");
  });

  it("shows the 'Личный профиль' subtitle and a trailing chevron next to the name", () => {
    const renderer = renderCard(profile({ displayName: "Александр" }));
    const texts = findTexts(renderer);
    expect(texts).toContain("Личный профиль");
    expect(texts).toContain("›");
  });

  it("renders an Image when a photo is set", () => {
    const renderer = renderCard(profile({ displayName: "А", profilePhotoUri: "file:///photo.jpg" }));
    const images = renderer.root.findAllByType("Image" as never);
    expect(images).toHaveLength(1);
    expect(images[0].props.source).toEqual({ uri: "file:///photo.jpg" });
  });

  it("falls back to an initials placeholder (no Image) without a photo", () => {
    const renderer = renderCard(profile({ displayName: "Александр" }));
    expect(renderer.root.findAllByType("Image" as never)).toHaveLength(0);
    expect(findTexts(renderer)).toContain("А");
  });

  it("falls back to the placeholder and notifies the caller when the saved photo fails to load", () => {
    const onInvalidPhoto = jest.fn();
    const renderer = renderCard(profile({ profilePhotoUri: "file:///missing.jpg" }), jest.fn(), onInvalidPhoto);
    act(() => {
      renderer.root.findAllByType("Image" as never)[0].props.onError();
    });
    expect(onInvalidPhoto).toHaveBeenCalledTimes(1);
    expect(renderer.root.findAllByType("Image" as never)).toHaveLength(0);
  });

  it("wraps a long name onto at most 2 lines instead of a single truncated line", () => {
    const longName = "Александр".repeat(10);
    const renderer = renderCard(profile({ displayName: longName }));
    const nameNode = renderer.root.findAll((n) => n.props.children === longName)[0];
    expect(nameNode.props.numberOfLines).toBe(2);
  });
});

describe("ProfileHeroCard — milestone rows", () => {
  const e = (id: string, title: string, date: string) => ({ id, title, date });

  it("shows exactly one row when only one event is added", () => {
    const renderer = renderCard(profile({ events: [e("1", "Крещение", "2016-08-15")] }));
    const texts = findTexts(renderer);
    expect(texts).toContain("Крещение");
    expect(texts).toContain("15-08-2016");
    expect(texts).toContain("+ Добавить событие");
  });

  it("shows every added row and nothing for unfilled slots (no placeholder text)", () => {
    const renderer = renderCard(
      profile({ events: [e("1", "Крещение", "2016-08-15"), e("2", "Пионер", "2022-09-01")] }),
    );
    const texts = findTexts(renderer);
    expect(texts).toContain("Крещение");
    expect(texts).toContain("Пионер");
    expect(texts).not.toEqual(expect.arrayContaining(["—", "-", "..."]));
  });

  it("shows exactly three rows top-to-bottom in array order and hides the add action at the limit", () => {
    const renderer = renderCard(
      profile({
        events: [e("1", "Крещение", "2016-08-15"), e("2", "Пионер", "2022-09-01"), e("3", "Переезд", "2024-03-12")],
      }),
    );
    const texts = findTexts(renderer);
    const iCr = texts.indexOf("Крещение");
    const iPi = texts.indexOf("Пионер");
    const iPe = texts.indexOf("Переезд");
    expect(iCr).toBeGreaterThanOrEqual(0);
    expect(iPi).toBeGreaterThan(iCr);
    expect(iPe).toBeGreaterThan(iPi);
    expect(texts).not.toContain("+ Добавить событие");
  });

  it("never renders a fourth row even if the profile somehow carries one", () => {
    const renderer = renderCard(
      profile({
        events: [
          e("1", "Событие 1", "2016-08-15"),
          e("2", "Событие 2", "2022-09-01"),
          e("3", "Событие 3", "2024-03-12"),
          e("4", "Событие 4", "2025-01-01"),
        ],
      }),
    );
    expect(findTexts(renderer)).not.toContain("Событие 4");
  });

  it("formats the date as DD-MM-YYYY and shows a compact elapsed duration", () => {
    const renderer = renderCard(profile({ events: [e("1", "Крещение", "2016-08-15")] }));
    const texts = findTexts(renderer);
    expect(texts).toContain("15-08-2016");
    expect(texts.some((t) => /^\d+ г( \d+ мес)?$|^\d+ мес$|^менее 1 мес$/.test(t))).toBe(true);
  });

  it("renders the event title exactly as stored — no uppercase transform, no invented casing", () => {
    const renderer = renderCard(profile({ events: [e("1", "крещение", "2016-08-15")] }));
    const titleNode = renderer.root.findAll((n) => n.props.children === "крещение")[0];
    expect(titleNode).toBeTruthy();
    const flatStyle = [titleNode.props.style].flat();
    expect(flatStyle.every((s) => !s || s.textTransform !== "uppercase")).toBe(true);
  });

  it("caps a long event title at 2 lines so it cannot push the row's value out of alignment", () => {
    const longTitle = "Очень длинное название события ".repeat(3).trim();
    const renderer = renderCard(profile({ events: [e("1", longTitle, "2016-08-15")] }));
    const titleNode = renderer.root.findAll((n) => n.props.children === longTitle)[0];
    expect(titleNode.props.numberOfLines).toBe(2);
  });

  it("gives every row its own accessible label instead of a separate card element", () => {
    const renderer = renderCard(
      profile({ events: [e("1", "Крещение", "2016-08-15"), e("2", "Пионер", "2022-09-01")] }),
    );
    const labels = renderer.root
      .findAll((n) => typeof n.props.accessibilityLabel === "string" && n.props.accessibilityLabel.startsWith("Крещение"));
    expect(labels.length).toBeGreaterThan(0);
  });
});
