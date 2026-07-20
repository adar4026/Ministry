import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { TIMELINE_COLORS } from "./timelineTokens";

// Swipe-left-to-delete wrapper for a single "События" card (TASK_041).
// Wraps react-native-gesture-handler's Swipeable — already a project
// dependency, and GestureHandlerRootView is already mounted at the app root
// (app/_layout.tsx) — no new dependency added. Tapping the revealed red
// action deletes immediately: the swipe + tap is already a deliberate
// two-step gesture (same convention as Apple Mail/Reminders), so a second
// confirmation dialog is not stacked on top of it.
//
// Radius is split across two nested Views rather than set once: the outer
// `shadowWrap` casts the card's drop shadow (shadows require
// overflow: "visible" to render), while the inner `clip` clips the
// Swipeable's sliding content — including the red action reveal — to the
// same rounded rect. A single view can't do both at once.
const RADIUS = 20;
const ACTION_WIDTH = 88;

export function SwipeableDeleteRow({
  children,
  onDelete,
  deleteAccessibilityLabel,
}: {
  children: ReactNode;
  onDelete: () => void;
  deleteAccessibilityLabel: string;
}) {
  function renderRightActions() {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={deleteAccessibilityLabel}
        style={styles.action}
        onPress={onDelete}
      >
        <Text style={styles.actionText}>Удалить</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.shadowWrap}>
      <View style={styles.clip}>
        <Swipeable renderRightActions={renderRightActions} overshootRight={false} friction={2}>
          {children}
        </Swipeable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: RADIUS,
    backgroundColor: TIMELINE_COLORS.cardBackground,
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  clip: {
    borderRadius: RADIUS,
    overflow: "hidden",
  },
  action: {
    width: ACTION_WIDTH,
    backgroundColor: TIMELINE_COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { color: TIMELINE_COLORS.onDanger, fontWeight: "700", fontSize: 15 },
});
