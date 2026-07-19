import { Stack } from "expo-router";

export default function HoursLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="month/[key]" />
      <Stack.Screen name="history" />
      <Stack.Screen name="stats" />
      <Stack.Screen name="timer" />
    </Stack>
  );
}