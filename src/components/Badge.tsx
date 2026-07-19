import { StyleSheet, Text, View } from "react-native";
import { CAT } from "@/data/constants";
import type { Category } from "@/types";

export function Badge({ category }: { category: Category }) {
  const c = CAT[category] ?? CAT.other;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.tx }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 20, alignSelf: "flex-start" },
  text: { fontSize: 11, fontWeight: "700" },
});
