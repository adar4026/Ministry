// TASK_037: shared circular back button used across nested screens.
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { BackButton } from "../BackButton";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), replace: jest.fn(), push: jest.fn() },
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { router: mockRouter } = jest.requireMock("expo-router") as {
  router: { back: jest.Mock; canGoBack: jest.Mock; replace: jest.Mock };
};

beforeEach(() => {
  mockRouter.back.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.canGoBack.mockReturnValue(true);
});

function findBackButton(root: ReactTestRenderer["root"]) {
  return root.findAll((n) => n.props.accessibilityLabel === "Назад")[0];
}

describe("BackButton", () => {
  it("is exposed as an accessible button labeled «Назад»", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<BackButton fallbackHref="/hours" />);
    });
    const btn = findBackButton(renderer!.root);
    expect(btn.props.accessibilityRole).toBe("button");
  });

  it("calls router.back() when there is history to pop", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<BackButton fallbackHref="/hours" />);
    });
    const btn = findBackButton(renderer!.root);
    await act(async () => btn.props.onPress());
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("falls back to fallbackHref when there is no history (direct deep-link load)", async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<BackButton fallbackHref="/hours/stats" />);
    });
    const btn = findBackButton(renderer!.root);
    await act(async () => btn.props.onPress());
    expect(mockRouter.replace).toHaveBeenCalledWith("/hours/stats");
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("defaults to a 44x44 hit area (visual size + zero extra hitSlop)", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<BackButton fallbackHref="/hours" />);
    });
    const btn = findBackButton(renderer!.root);
    // Pressable's `style` prop is a (pressed) => style[] function, resolved
    // internally on render — call it directly to inspect the base style.
    const resolved = btn.props.style({ pressed: false });
    const flatStyle = Object.assign({}, ...resolved.filter(Boolean));
    expect(flatStyle.width).toBe(44);
    expect(flatStyle.height).toBe(44);
    expect(btn.props.hitSlop).toBe(0);
  });

  it("grows hitSlop to keep the hit area at least 44x44 when a smaller visual size is requested", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<BackButton fallbackHref="/hours" size={36} />);
    });
    const btn = findBackButton(renderer!.root);
    expect(btn.props.hitSlop).toBe(4); // (44-36)/2
  });
});
