// TASK_077 — DrawerGroup: Finance's `.drawer-card` glass per group.
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { DrawerGroup } from "../DrawerGroup";
import { DRAWER_ICE } from "@/components/dashboard/tokens";

function flat(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
  return (style ?? {}) as Record<string, unknown>;
}

describe("DrawerGroup", () => {
  let renderer!: ReactTestRenderer;
  beforeEach(() => {
    act(() => {
      renderer = create(
        <DrawerGroup title="Служение">
          <Text>Цели</Text>
        </DrawerGroup>,
      );
    });
  });

  it("renders the uppercase header in the drawer's grey-blue secondary ink", () => {
    const title = renderer.root.findAll((n) => n.props.children === "Служение")[0];
    const ts = flat(title.props.style);
    expect(title.props.accessibilityRole).toBe("header");
    expect(ts.textTransform).toBe("uppercase");
    expect(ts.color).toBe(DRAWER_ICE.ink2);
  });

  it("the card is Finance's .drawer-card: hero-glass fill, 1 px glass rim, radius 22, the faint card shadow", () => {
    const group = renderer.root.findByProps({ testID: "drawer-group" });
    const card = group.findAll((n) => (n.type as unknown) === "View" && flat(n.props.style).backgroundColor === DRAWER_ICE.glass)[0];
    expect(card).toBeTruthy();
    const cs = flat(card.props.style);
    expect(cs.borderRadius).toBe(22);
    expect(cs.overflow).toBe("hidden");
    expect(cs.borderWidth).toBe(1);
    expect(cs.borderColor).toBe(DRAWER_ICE.glassBorder);
    expect(cs.shadowColor).toBe(DRAWER_ICE.cardShadow);
    expect(cs.shadowOpacity).toBe(DRAWER_ICE.cardShadowOpacity);
    expect(cs.shadowRadius).toBe(10);
  });
});
