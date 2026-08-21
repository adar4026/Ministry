import { StyleSheet, Text, View } from "react-native";
import { TALK_CATEGORY } from "@/data/constants";

// Extracted from the "События" screen's inline talk badge (TASK_041) so the
// unified card (EventListCard) can share it across the Events timeline,
// Home and /upcoming-events (TASK_056) — same style Badge.tsx uses for
// system/custom categories, just keyed to the fixed TALK_CATEGORY instead of
// MinistryEvent's category field.
export function TalkBadge() {
  return (
    <View style={[styles.badge, { backgroundColor: TALK_CATEGORY.bg }]}>
      <Text style={[styles.text, { color: TALK_CATEGORY.tx }]}>{TALK_CATEGORY.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 20, alignSelf: "flex-start" },
  text: { fontSize: 11, fontWeight: "700" },
});
