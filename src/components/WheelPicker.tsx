import { useEffect, useRef, useState } from "react";
import {
  AccessibilityActionEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { COLORS } from "@/data/constants";

// Compact, closer to a native iOS UIPickerView row than the original 40 —
// the owner's physical-device check found 40 noticeably sparser than a
// system wheel, and a first pass at 34 still visibly looser than the
// owner's reference screenshot (TASK_030 follow-up, second pass).
const ITEM_HEIGHT = 30;
const VISIBLE_ITEMS = 5;
const PADDING = Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT;

// Fires once per settled index change, never mid-drag — avoids the "haptic
// spam" the owner explicitly ruled out, at the cost of feedback only at
// rest rather than continuously while turning the wheel. Web has no haptics
// engine; expo-haptics' web shim would otherwise silently resolve anyway,
// but the explicit Platform guard is what the spec asks for.
function triggerSelectionHaptic() {
  if (Platform.OS === "web") return;
  Haptics.selectionAsync().catch(() => {});
}

export type WheelItem = { value: number; label: string };

// Presentational-only iOS-style scrollable wheel: no domain knowledge of
// what the values mean (TASK_011). Selection is driven by the nearest item
// to the vertical center once a scroll gesture ends; tapping a visible row
// also selects it directly.
export function WheelPicker({
  items,
  value,
  onChange,
  accessibilityLabel,
  highlightColor = COLORS.groupedBg,
}: {
  items: WheelItem[];
  value: number;
  onChange: (value: number) => void;
  accessibilityLabel?: string;
  highlightColor?: string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.value === value),
  );
  const [scrollOffset, setScrollOffset] = useState(selectedIndex * ITEM_HEIGHT);
  const didInitialScroll = useRef(false);
  // react-native-web's ScrollViewBase accepts onScrollEndDrag/
  // onMomentumScrollEnd as props but never actually invokes them — its
  // internal settle-debounce (ScrollViewBase.js `handleScrollEnd`) only
  // re-fires plain `onScroll`. On web, then, `handleScrollEnd` below would
  // never run: the row still *looks* centered (opacity is driven by the
  // always-firing onScroll -> scrollOffset state) but the value silently
  // never commits — visually right, functionally stuck. This timer is that
  // missing signal for web only; native iOS/Android already gets a real
  // onScrollEndDrag/onMomentumScrollEnd from the platform and is untouched.
  const webSettleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the index this component itself last scrolled to, so the
  // resync effect below can tell "value changed because the user picked a
  // row" (already matches, no-op) apart from "value changed from outside"
  // (needs an imperative scroll) — without that distinction the effect
  // would fight every user drag/tap.
  const lastScrolledIndex = useRef(selectedIndex);
  // Tracks the index a haptic was last fired for, independent of
  // `lastScrolledIndex` above — both start equal to the mount-time index so
  // neither the initial programmatic scroll nor an external value-only
  // resync (below) produces a "phantom" haptic; only an index change that
  // actually settles via `snapToIndex` moves this forward.
  const lastHapticIndex = useRef(selectedIndex);

  // `contentOffset` only reliably seeds the initial scroll position on
  // native iOS; on web the ScrollView's content isn't measured yet at mount
  // time (its atomic CSS classes land a tick after the first paint), so a
  // plain post-mount effect fires `scrollTo` before there's anything to
  // scroll to. `onContentSizeChange` fires once real content dimensions are
  // known, on every platform, so seed the initial position there instead.
  function handleContentSizeChange() {
    if (didInitialScroll.current) return;
    didInitialScroll.current = true;
    lastScrolledIndex.current = selectedIndex;
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
  }

  function snapToIndex(index: number) {
    const clamped = Math.min(Math.max(index, 0), items.length - 1);
    lastScrolledIndex.current = clamped;
    scrollRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
    // Both haptic and onChange gate on the same ref, not the `value` prop —
    // `value` only reflects this settle once the parent has re-rendered
    // with it, which on a fast settle-then-settle-again (e.g. a real
    // onMomentumScrollEnd racing the web debounce below) can still be the
    // *previous* value. A ref updates immediately, so two settles landing
    // on the same index only ever commit once, regardless of React's
    // render timing.
    if (clamped !== lastHapticIndex.current) {
      lastHapticIndex.current = clamped;
      triggerSelectionHaptic();
      const item = items[clamped];
      if (item) onChange(item.value);
    }
  }

  // `onScrollEndDrag`'s `contentOffset` is where the finger let go, not
  // where the scroll will actually rest — on a fast flick those differ, and
  // rounding the release-moment offset picks the row nearest the finger
  // instead of the row iOS's own `snapToInterval` deceleration is already
  // animating toward. That mismatch made this `scrollTo` fight the in-flight
  // native animation, which is what let the list settle between two rows.
  // iOS's Fabric scroll-end-drag event also carries `targetContentOffset` —
  // the exact offset native snapping already committed to — so prefer that
  // when present; it agrees with (rather than fights) the native animation
  // for both slow drags and fast flicks alike. `onMomentumScrollEnd` never
  // carries `targetContentOffset` (there's nothing left to target, momentum
  // already finished), so it falls back to the settled `contentOffset`.
  function handleScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const offsetY = e.nativeEvent.targetContentOffset?.y ?? e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    snapToIndex(index);
  }

  // Every real scroll tick reschedules this — so it only actually fires
  // 130ms after the *last* one, i.e. once the wheel has stopped moving.
  // 130ms is comfortably past RNW's own 100ms internal settle debounce
  // (ScrollViewBase.js), so this always sees the final resting offset, not
  // a mid-scroll one. Native iOS/Android ignore this entirely — they get a
  // real onScrollEndDrag/onMomentumScrollEnd from the platform, which fires
  // (and calls snapToIndex) well before this timer would. When it *does*
  // fire there, `snapToIndex`'s own idempotency (no duplicate onChange/
  // haptic for an index that's already current) makes the redundant call
  // harmless rather than a double-fire.
  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setScrollOffset(e.nativeEvent.contentOffset.y);
    if (Platform.OS !== "web") return;
    if (webSettleTimeout.current != null) clearTimeout(webSettleTimeout.current);
    webSettleTimeout.current = setTimeout(() => handleScrollEnd(e), 130);
  }

  // Belt-and-braces cleanup: without this, a picker unmounted mid-scroll
  // (e.g. the user backs out of the screen right after a flick) leaves a
  // pending timer that fires `onChange`/`scrollTo` against an unmounted
  // component once the 130ms elapses.
  useEffect(() => {
    return () => {
      if (webSettleTimeout.current != null) clearTimeout(webSettleTimeout.current);
    };
  }, []);

  function handleAccessibilityAction(e: AccessibilityActionEvent) {
    if (e.nativeEvent.actionName === "increment") snapToIndex(selectedIndex + 1);
    else if (e.nativeEvent.actionName === "decrement") snapToIndex(selectedIndex - 1);
  }

  // Reposition when `value` changes for a reason other than this
  // component's own selection (e.g. a parent resetting the picker) — never
  // fires from the user's own drag/tap, since `snapToIndex` above already
  // updates `lastScrolledIndex` before `value` changes.
  useEffect(() => {
    if (!didInitialScroll.current) return;
    if (selectedIndex === lastScrolledIndex.current) return;
    lastScrolledIndex.current = selectedIndex;
    // This is a controlled correction, not a settled user selection — mark
    // it as already "felt" so the animated scrollTo's own eventual
    // onMomentumScrollEnd doesn't re-fire a haptic for the same index.
    lastHapticIndex.current = selectedIndex;
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: true });
  }, [selectedIndex]);

  return (
    <View style={[styles.container, { height: ITEM_HEIGHT * VISIBLE_ITEMS }]}>
      <View pointerEvents="none" style={[styles.highlight, { top: PADDING, backgroundColor: highlightColor }]} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: PADDING }}
        contentOffset={{ x: 0, y: selectedIndex * ITEM_HEIGHT }}
        onContentSizeChange={handleContentSizeChange}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: items[selectedIndex]?.label }}
        accessibilityActions={[
          { name: "increment", label: "Следующее значение" },
          { name: "decrement", label: "Предыдущее значение" },
        ]}
        onAccessibilityAction={handleAccessibilityAction}
      >
        {items.map((item, index) => {
          const distance = Math.abs(scrollOffset / ITEM_HEIGHT - index);
          const opacity = Math.max(0.25, 1 - distance * 0.4);
          return (
            <Pressable
              key={item.value}
              onPress={() => snapToIndex(index)}
              style={styles.item}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Text style={[styles.itemText, { opacity }]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden" },
  highlight: {
    position: "absolute",
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    borderRadius: 12,
    backgroundColor: COLORS.groupedBg,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: { fontSize: 16, fontWeight: "600", color: COLORS.text },
});
