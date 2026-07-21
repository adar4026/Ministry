import { StyleSheet, Text, View } from "react-native";
import { categoryMeta } from "@/data/constants";
import type { CustomCategory } from "@/types";

// `category` is a system Category key or a CustomCategory.id (TASK_045).
// `customCategories` is optional/defaults to `[]` so every existing call
// site (that only ever passed system categories) keeps working unchanged.
export function Badge({
  category,
  customCategories = [],
}: {
  category: string;
  customCategories?: CustomCategory[];
}) {
  const c = categoryMeta(category, customCategories);
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
