// TASK_066 — the drawer's branded footer, after every group and inside the
// scroll (never fixed over the content): "A-Lex Ministry · v0.4.4" and
// "Обновлено: сентябрь 2026", both from src/data/appInfo.ts — nothing typed
// here by hand. Same shape as Finance's `.drawer-footer` / ReleaseInfo.
import { StyleSheet, Text, View } from "react-native";
import { DRAWER_ICE } from "@/components/dashboard/tokens";
import { APP_DISPLAY_NAME, APP_VERSION, formatUpdatedLabel } from "@/data/appInfo";

export function DrawerFooter({ bottomInset = 0 }: { bottomInset?: number }) {
  return (
    <View style={[styles.wrap, { paddingBottom: 22 + bottomInset }]} testID="drawer-footer">
      <Text style={styles.name}>{`${APP_DISPLAY_NAME} · v${APP_VERSION}`}</Text>
      <Text style={styles.date}>{`Обновлено: ${formatUpdatedLabel()}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 28, paddingHorizontal: 20, gap: 2 },
  name: { fontSize: 12.5, fontWeight: "700", color: DRAWER_ICE.ink2, letterSpacing: 0.1, textAlign: "center" },
  date: { fontSize: 12, fontWeight: "500", color: DRAWER_ICE.ink2, opacity: 0.8, textAlign: "center" },
});
