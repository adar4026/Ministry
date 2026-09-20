// TASK_066 — one titled section of the Home drawer: an uppercase group
// label and a translucent card holding ProfileSettingsRow children
// (rendered in their "drawer" variant by the drawer's context provider).
//
// TASK_077 — Finance's `.drawer-card` / `.drawer-group-title`, reproduced:
// `--hero-glass` fill, a 1 px `--hero-glass-border` rim, radius 22,
// blur(14px) and the near-invisible `--tx-card-shadow`; the title is
// 12/600 muted uppercase, 0.03 em tracking, 14 px inset, 6 px under it.
// Colours are DRAWER_ICE, not the hero's teal inks.
import type { ReactNode } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { DRAWER_ICE } from "@/components/dashboard/tokens";

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
    color: DRAWER_ICE.ink2,
    textTransform: "uppercase",
    letterSpacing: 0.36,
    paddingHorizontal: 14,
  },
  card: {
    backgroundColor: DRAWER_ICE.glass,
    borderWidth: 1,
    borderColor: DRAWER_ICE.glassBorder,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: DRAWER_ICE.cardShadow,
    shadowOpacity: DRAWER_ICE.cardShadowOpacity,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
});
