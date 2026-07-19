import { act, create } from "react-test-renderer";
import { WheelPicker } from "@/components/WheelPicker";

jest.mock("expo-haptics", () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Haptics = jest.requireMock("expo-haptics") as { selectionAsync: jest.Mock };

jest.setTimeout(30000);

const ROW_HEIGHT = 30; // TASK_030 follow-up: compacted 40 -> 34 -> 30

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

  it("snaps to targetContentOffset (native snapToInterval result) rather than the release-moment contentOffset on a fast flick", () => {
    // On a fast flick, contentOffset at onScrollEndDrag time is wherever the
    // finger happened to be — not where momentum will carry the list.
    // targetContentOffset is what iOS's own snapToInterval already computed
    // as the resting point, so that's what must win.
    const onChange = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<WheelPicker items={ITEMS} value={0} onChange={onChange} />);
    });
    act(() => {
      findScrollView(renderer.root).props.onScrollEndDrag({
        nativeEvent: {
          contentOffset: { y: 0.6 * ROW_HEIGHT }, // nearest-by-rounding would be index 1
          targetContentOffset: { y: 3 * ROW_HEIGHT }, // but native momentum is heading to index 3
        },
      });
    });
    expect(onChange).toHaveBeenCalledWith(3);
    expect(onChange).not.toHaveBeenCalledWith(1);
  });

  it("falls back to contentOffset when targetContentOffset is absent (e.g. onMomentumScrollEnd, or platforms that don't report it)", () => {
    const onChange = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<WheelPicker items={ITEMS} value={0} onChange={onChange} />);
    });
    act(() => {
      findScrollView(renderer.root).props.onScrollEndDrag({
        nativeEvent: { contentOffset: { y: 2 * ROW_HEIGHT } },
      });
    });
    expect(onChange).toHaveBeenCalledWith(2);
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

  it("seeds the initial scroll offset using the compact 30px row height", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<WheelPicker items={ITEMS} value={2} onChange={jest.fn()} />);
    });
    expect(findScrollView(renderer.root).props.contentOffset.y).toBe(2 * ROW_HEIGHT);
  });

  describe("haptic feedback", () => {
    beforeEach(() => {
      Haptics.selectionAsync.mockClear();
    });

    it("does not fire on mount / initial programmatic positioning", () => {
      act(() => {
        create(<WheelPicker items={ITEMS} value={2} onChange={jest.fn()} />);
      });
      expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    });

    it("fires exactly once when a scroll settles on a different index", () => {
      let renderer!: ReturnType<typeof create>;
      act(() => {
        renderer = create(<WheelPicker items={ITEMS} value={0} onChange={jest.fn()} />);
      });
      act(() => {
        findScrollView(renderer.root).props.onMomentumScrollEnd({
          nativeEvent: { contentOffset: { y: 2 * ROW_HEIGHT } },
        });
      });
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    });

    it("does not fire when a scroll settles back on the already-selected index", () => {
      let renderer!: ReturnType<typeof create>;
      act(() => {
        renderer = create(<WheelPicker items={ITEMS} value={0} onChange={jest.fn()} />);
      });
      act(() => {
        findScrollView(renderer.root).props.onScrollEndDrag({
          nativeEvent: { contentOffset: { y: 0 } },
        });
      });
      expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    });

    it("does not fire a second time when momentum-end and drag-end both settle on the same new index", () => {
      let renderer!: ReturnType<typeof create>;
      act(() => {
        renderer = create(<WheelPicker items={ITEMS} value={0} onChange={jest.fn()} />);
      });
      act(() => {
        findScrollView(renderer.root).props.onScrollEndDrag({
          nativeEvent: { contentOffset: { y: 1 * ROW_HEIGHT } },
        });
      });
      act(() => {
        findScrollView(renderer.root).props.onMomentumScrollEnd({
          nativeEvent: { contentOffset: { y: 1 * ROW_HEIGHT } },
        });
      });
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    });

    it("fires once for a fast flick, using the targetContentOffset index rather than the release-moment index", () => {
      let renderer!: ReturnType<typeof create>;
      act(() => {
        renderer = create(<WheelPicker items={ITEMS} value={0} onChange={jest.fn()} />);
      });
      act(() => {
        findScrollView(renderer.root).props.onScrollEndDrag({
          nativeEvent: {
            contentOffset: { y: 0.6 * ROW_HEIGHT },
            targetContentOffset: { y: 3 * ROW_HEIGHT },
          },
        });
      });
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
      act(() => {
        findScrollView(renderer.root).props.onMomentumScrollEnd({
          nativeEvent: { contentOffset: { y: 3 * ROW_HEIGHT } },
        });
      });
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    });

    it("fires once for a direct tap on a different row (fast flick / tap parity)", () => {
      const onChange = jest.fn();
      let renderer!: ReturnType<typeof create>;
      act(() => {
        renderer = create(<WheelPicker items={ITEMS} value={0} onChange={onChange} />);
      });
      act(() => {
        pressableRows(renderer.root)[3].props.onPress();
      });
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(3);
    });

    it("does not fire when tapping the already-selected row", () => {
      let renderer!: ReturnType<typeof create>;
      act(() => {
        renderer = create(<WheelPicker items={ITEMS} value={1} onChange={jest.fn()} />);
      });
      act(() => {
        pressableRows(renderer.root)[1].props.onPress();
      });
      expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    });
  });
});
