import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { DS } from "./tokens";
import { useThemedStyles } from "@/theme";

// Section title for dashboard-style screens (TASK_007). Optional `action`
// slot on the right (e.g. an "Изменить"/"Все" link on future screens).
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ?? null}
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 23, fontWeight: "700", color: DS.navy, letterSpacing: -0.3 },
});
