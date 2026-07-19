import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/data/constants";
import type { Talk } from "@/types";

export function TalkRow({ talk, onPress }: { talk: Talk; onPress: () => void }) {
  const title = talk.title || (talk.number ? `Речь №${talk.number}` : "Специальная речь");
  const subtitle = talk.location ? `${talk.date}  —  ${talk.location}` : talk.date;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.numBox}>
        <Text style={talk.number ? styles.num : styles.special}>
          {talk.number ?? "★"}
        </Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.edit}>✏</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pressed: { opacity: 0.7 },
  numBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.light,
    alignItems: "center",
    justifyContent: "center",
  },
  num: { fontSize: 17, fontWeight: "700", color: COLORS.blue },
  special: { fontSize: 19, color: COLORS.blue },
  body: { flex: 1 },
  title: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  edit: { fontSize: 15, color: COLORS.muted, paddingHorizontal: 4 },
});
