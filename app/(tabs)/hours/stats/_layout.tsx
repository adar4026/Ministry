import { Stack } from "expo-router";

export default function StatsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="month/[key]" />
      <Stack.Screen name="year/[key]" />
    </Stack>
  );
}
