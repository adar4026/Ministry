import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { COLORS, formatDateDMY, formatHM } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import type { Session } from "@/types";

interface SessionRowProps {
  session: Session;
  onPress: () => void;
  onLongPress: () => void;
}

export function SessionRow({ session, onPress, onLongPress }: SessionRowProps) {
  const { deleteSession } = useStore();

  const handleDelete = () => {
    Alert.alert(
      "Delete session?",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteSession(session.id);
            onLongPress();
          },
        },
      ]
    );
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={handleDelete}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Session ${formatDateDMY(session.date)}, ${formatHM(session.durationMinutes / 60)}`}
      accessibilityHint="Double tap to edit. Long press to delete."
    >
      <View style={styles.content}>
        <Text style={styles.date}>{formatDateDMY(session.date)}</Text>
        <Text style={styles.duration}>{formatHM(session.durationMinutes / 60)}</Text>
        {session.note && <Text style={styles.note}>{session.note}</Text>}
      </View>
      <View style={styles.sourceBadge}>
        <Text style={styles.sourceText}>{session.source === "timer" ? "Timer" : "Manual"}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  pressed: { opacity: 0.7 },
  content: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  date: { fontSize: 13, fontWeight: "600", color: COLORS.text, minWidth: 60 },
  duration: { fontSize: 13, fontWeight: "700", color: COLORS.accent },
  note: { fontSize: 12, color: COLORS.muted, flex: 1 },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: COLORS.light,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.accent,
    textTransform: "capitalize",
  },
});