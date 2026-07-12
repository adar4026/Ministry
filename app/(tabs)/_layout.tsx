import { Tabs } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "@/components/Header";
import { TabBar } from "@/components/TabBar";
import { COLORS } from "@/data/constants";
import { useStore } from "@/store/StoreContext";

export default function TabsLayout() {
  const { loaded } = useStore();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <Header />
      {loaded ? (
        <Tabs
          tabBar={(props) => <TabBar {...props} />}
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: COLORS.bg, paddingBottom: 90 },
          }}
        >
          <Tabs.Screen name="index" options={{ title: "Главная" }} />
          <Tabs.Screen name="hours" options={{ title: "Часы" }} />
          <Tabs.Screen name="timeline" options={{ title: "События" }} />
          <Tabs.Screen name="talks" options={{ title: "Речи" }} />
          <Tabs.Screen name="add" options={{ title: "Добавить" }} />
        </Tabs>
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
});
