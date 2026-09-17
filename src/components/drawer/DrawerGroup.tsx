// TASK_066 — one titled section of the Home drawer: an uppercase group
// label and a translucent glass card holding ProfileSettingsRow children
// (rendered in their "drawer" variant by the drawer's context provider).
//
// Modelled on A-Lex Finance's `.drawer-group` / `.drawer-card` — big radius,
// light glass surface, hairline border, almost no shadow — but painted with
// Ministry's own tokens: white glass over the mint hero scene, ink/ink2
// text. Never a heavy white slab.
import type { ReactNode } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { MINISTRY } from "@/components/dashboard/tokens";

const GLASS = Platform.select<object>({
  web: { backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" },
  default: {},
});

export function DrawerGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group} accessibilityRole="none" testID="drawer-group">
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <View style={[styles.card, GLASS]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 6 },
  title: {
    fontSize: 12,
    fontWeight: "600",
    color: MINISTRY.ink2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 14,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    overflow: "hidden",
    shadowColor: MINISTRY.heroDeep,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
});
