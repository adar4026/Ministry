import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/data/constants";

// Placeholder avatar: initials on a navy circle. Photo support comes later.
export function Avatar({
  size = 40,
  initials = "АТ",
  onPress,
}: {
  size?: number;
  initials?: string;
  onPress?: () => void;
}) {
  const circle = (
    <View
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );

  if (!onPress) return circle;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Профиль"
      style={({ pressed }) => pressed && styles.pressed}
    >
      {circle}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { color: "#fff", fontWeight: "800" },
  pressed: { opacity: 0.8 },
});
