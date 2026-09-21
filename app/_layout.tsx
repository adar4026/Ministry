import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StoreProvider } from "@/store/StoreContext";
import { ThemeProvider, useTheme } from "@/theme";

// TASK_078 — the status bar follows the active scheme (light icons on dark).
function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          {/* TASK_078 — inside StoreProvider: the preference lives in settings. */}
          <ThemeProvider>
            <ThemedStatusBar />
            <Stack screenOptions={{ headerShown: false }} />
          </ThemeProvider>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
