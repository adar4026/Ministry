import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { DS } from "./tokens";

// Section title for dashboard-style screens (TASK_007). Optional `action`
// slot on the right (e.g. an "Изменить"/"Все" link on future screens).
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "800", color: DS.navy, letterSpacing: -0.3 },
});
