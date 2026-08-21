import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { TIMELINE_COLORS } from "./timelineTokens";

// Non-swipeable counterpart to SwipeableDeleteRow's shadowWrap+clip
// (TASK_056) — same radius/shadow values, no Swipeable/gesture. Used to give
// Home's and /upcoming-events' cards the exact "События"-card silhouette
// without adding a delete gesture that was never part of this task.
const RADIUS = 20;

export function StaticCardShell({ children }: { children: ReactNode }) {
  return (
    <View style={styles.shadowWrap}>
      <View style={styles.clip}>{children}</View>
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
});
