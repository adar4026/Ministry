import { useEffect, useRef } from "react";
import { Animated, Modal as RNModal, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CalendarIcon, TagIcon } from "@/components/icons";
import { DS } from "@/components/dashboard";
import { COLORS } from "@/data/constants";

// TASK_058 — the "+" bottom sheet on the "События" screen, replacing the
// two large "Добавить событие"/"Добавить тему" tiles. Both actions still
// open the exact same, unchanged forms/routes those tiles used to
// (`router.push('/add?focus=event')` and the existing topic `Modal`,
// TASK_045 §2/§3) — this component only owns the picker UI in front of them.
//
// Same base primitive as `ProfileEditSheet.tsx` (`RNModal transparent
// animationType="slide"`, dark backdrop, tap-outside-to-close,
// nested stopPropagation Pressable) so background scroll-blocking and
// stacking above the floating TabBar behave identically to that
// already-verified sheet. `PanResponder`/`Animated` are both plain
// `react-native` — no new dependency for the swipe-down-to-dismiss gesture.
const DISMISS_DY = 90;
const DISMISS_VELOCITY = 1.1;

function triggerHaptic(fn: () => Promise<void>) {
  // expo-haptics rejects/no-ops on platforms without haptics (web) — this
  // sheet's open/select feedback is a nice-to-have, never a hard dependency.
  fn().catch(() => {});
}

export function AddActionSheet({
  visible,
  onClose,
  onAddEvent,
  onAddTopic,
}: {
  visible: boolean;
  onClose: () => void;
  onAddEvent: () => void;
  onAddTopic: () => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    }
  }, [visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_evt, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dy > DISMISS_DY || gesture.vy > DISMISS_VELOCITY) {
          Animated.timing(translateY, { toValue: 500, duration: 180, useNativeDriver: true }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    }),
  ).current;

  function select(action: () => void) {
    triggerHaptic(() => Haptics.selectionAsync());
    onClose();
    action();
  }

  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Закрыть меню добавления">
        <Animated.View
          style={[styles.sheet, { paddingBottom: Math.max(18, insets.bottom), transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabber} />
            <View style={styles.header}>
              <Text style={styles.title}>Добавить</Text>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Закрыть"
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => select(onAddEvent)}
              accessibilityRole="button"
              accessibilityLabel="Добавить событие"
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={[styles.iconWrap, { backgroundColor: DS.accent }]}>
                <CalendarIcon size={20} color={DS.onAccent} />
              </View>
              <Text style={styles.rowText}>Добавить событие</Text>
            </Pressable>

            <Pressable
              onPress={() => select(onAddTopic)}
              accessibilityRole="button"
              accessibilityLabel="Добавить тему"
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={[styles.iconWrap, { backgroundColor: DS.navy }]}>
                <TagIcon size={20} color={DS.onAccent} />
              </View>
              <Text style={styles.rowText}>Добавить тему</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: { fontSize: 20, fontWeight: "700", color: DS.navy },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.groupedBg,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { fontSize: 16, fontWeight: "600", color: DS.navy },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: DS.divider,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 10,
    minHeight: 56,
  },
  rowPressed: { opacity: 0.7 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { fontSize: 16, fontWeight: "600", color: DS.navy },
});
