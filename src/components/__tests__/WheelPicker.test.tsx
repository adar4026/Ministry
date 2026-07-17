import { act, create } from "react-test-renderer";
import { WheelPicker } from "@/components/WheelPicker";

jest.setTimeout(30000);

const ITEMS = [
  { value: 0, label: "0 часов" },
  { value: 1, label: "1 час" },
  { value: 2, label: "2 часа" },
  { value: 3, label: "3 часа" },
];

// react-native's Pressable is React.memo(forwardRef(...)); react-test-renderer
// exposes the *inner* render function as the matched node's type, which is a
// different reference from the `Pressable` export itself, so
// `findAllByType(Pressable)` never matches (findAllByType relies on strict
// reference equality). Matching by displayName sidesteps that — the node's
// `.props` are still the original element props (onPress, accessibilityLabel).
function pressableRows(root: ReturnType<typeof create>["root"]) {
  return root.findAll((n) => (n.type as any)?.displayName === "Pressable" || (n.type as any)?.name === "Pressable");
}

describe("WheelPicker", () => {
  it("renders one row per item", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<WheelPicker items={ITEMS} value={0} onChange={jest.fn()} />);
    });
    expect(pressableRows(renderer.root)).toHaveLength(ITEMS.length);
  });

  it("reports the tapped row's value via onChange", () => {
    const onChange = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<WheelPicker items={ITEMS} value={0} onChange={onChange} />);
    });
    act(() => {
      pressableRows(renderer.root)[2].props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("does not call onChange when the already-selected row is tapped", () => {
    const onChange = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<WheelPicker items={ITEMS} value={1} onChange={onChange} />);
    });
    act(() => {
      pressableRows(renderer.root)[1].props.onPress();
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  function findScrollView(root: ReturnType<typeof create>["root"]) {
    return root.findAll((n) => Array.isArray(n.props.accessibilityActions))[0];
  }

  it("accepts an externally-changed controlled value without calling onChange (no feedback loop)", () => {
    const onChange = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<WheelPicker items={ITEMS} value={0} onChange={onChange} />);
    });
    act(() => {
      renderer.update(<WheelPicker items={ITEMS} value={2} onChange={onChange} />);
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(findScrollView(renderer.root).props.accessibilityValue.text).toBe("2 часа");
  });

  it("increments the value via the adjustable accessibility action", () => {
    const onChange = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<WheelPicker items={ITEMS} value={0} onChange={onChange} />);
    });
    act(() => {
      findScrollView(renderer.root).props.onAccessibilityAction({
        nativeEvent: { actionName: "increment" },
      });
    });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("decrements the value via the adjustable accessibility action", () => {
    const onChange = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<WheelPicker items={ITEMS} value={2} onChange={onChange} />);
    });
    act(() => {
      findScrollView(renderer.root).props.onAccessibilityAction({
        nativeEvent: { actionName: "decrement" },
      });
    });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("clamps the decrement action at the first item instead of underflowing", () => {
    const onChange = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<WheelPicker items={ITEMS} value={0} onChange={onChange} />);
    });
    act(() => {
      findScrollView(renderer.root).props.onAccessibilityAction({
        nativeEvent: { actionName: "decrement" },
      });
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clamps the increment action at the last item instead of overflowing", () => {
    const onChange = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <WheelPicker items={ITEMS} value={ITEMS[ITEMS.length - 1].value} onChange={onChange} />,
      );
    });
    act(() => {
      findScrollView(renderer.root).props.onAccessibilityAction({
        nativeEvent: { actionName: "increment" },
      });
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
