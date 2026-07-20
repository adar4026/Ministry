import { Alert, Platform } from "react-native";

// Cross-platform destructive-action confirmation (TASK_034). Native
// `Alert.alert` renders a real dialog and works today; react-native-web's
// `Alert.alert` is a total no-op (`class Alert { static alert() {} }`,
// node_modules/react-native-web/dist/exports/Alert/index.js) — on web, a
// destructive `onPress` passed to `Alert.alert` never fires, silently
// disabling delete for every caller that relied on it (see
// src/components/settings/BackupSection.tsx for the same root cause hitting
// a different flow). `window.confirm` is the browser's own synchronous
// confirmation and is what web callers get instead.
export function confirmAsync(title: string, message: string): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Отмена", style: "cancel", onPress: () => resolve(false) },
      { text: "Удалить", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}
