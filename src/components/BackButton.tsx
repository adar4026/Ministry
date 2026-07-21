import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { ChevronRightIcon } from "@/components/icons";
import { COLORS } from "@/data/constants";

interface BackButtonProps {
  // Where to send the user when this screen has no history to pop — e.g. a
  // direct/deep-link load. Each screen owns its own logically-parent route;
  // there is no single app-wide default that's always correct.
  fallbackHref: string;
  // Skips the canGoBack()/back() history pop and always replaces to
  // fallbackHref instead (TASK_045A). Needed for screens reached via a
  // *cross-tab* push (e.g. `/add?focus=event` from `timeline.tsx` — both are
  // sibling Tabs.Screen routes, not nested in a shared Stack): switching tabs
  // via the tab bar itself never pushes a history entry, so the entry
  // canGoBack()/back() would pop to is whatever was open *before* the tab was
  // switched to, not the tab that pushed this screen. Screens nested in their
  // own Stack (hours/timer.tsx, hours/history.tsx, upcoming-events.tsx) don't
  // have this problem — back() there always pops to the correct parent —
  // so they leave this false (default).
  alwaysReplace?: boolean;
  // Visual overrides so the button reads correctly against a screen's own
  // token palette (history.tsx/upcoming-events.tsx each define their own
  // color constants) — defaults match the shared COLORS used everywhere
  // else that doesn't have a local palette.
  background?: string;
  color?: string;
  size?: number;
  // Placement within a screen's header (e.g. `position: "absolute", left: 16`
  // to center a title next to it) — every other visual aspect stays fixed.
  style?: StyleProp<ViewStyle>;
}

// Единая круглая кнопка «Назад» (TASK_037 §6). Visual circle defaults to
// 44px, which is also the minimum touch target Apple/WCAG require — no
// extra hitSlop needed at the default size; hitSlop grows to compensate
// only if a caller shrinks `size` below 44.
export function BackButton({
  fallbackHref,
  alwaysReplace = false,
  background = COLORS.card,
  color = COLORS.text,
  size = 44,
  style,
}: BackButtonProps) {
  function handlePress() {
    if (!alwaysReplace && router.canGoBack()) router.back();
    else router.replace(fallbackHref as any);
  }

  const extraHitSlop = Math.max(0, (44 - size) / 2);

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={extraHitSlop}
      accessibilityRole="button"
      accessibilityLabel="Назад"
      style={({ pressed }) => [
        styles.btn,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
        style,
        pressed && styles.pressed,
      ]}
    >
      <ChevronRightIcon size={18} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    transform: [{ rotate: "180deg" }],
  },
  pressed: { opacity: 0.6 },
});
