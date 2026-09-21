// TASK_066 — the Profile page's menu items, shared by the page
// (app/(tabs)/profile.tsx) and the Home drawer (src/components/drawer/
// HomeDrawer.tsx). One list, one `soon()` placeholder: the drawer is not a
// second, hand-copied version of the page that could drift from it.
//
// Rows are DATA only (label, icon, route or placeholder); the two surfaces
// decide how to group and paint them. Behaviour is exactly TASK_044/059's:
// "Уведомления" opens the real /notifications route, every other row still
// shows the "Появится позже" alert until its feature ships.
import type { ComponentType } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import {
  BellIcon,
  CalendarIcon,
  ChartIcon,
  ClockIcon,
  GlobeIcon,
  type IconProps,
  MessageIcon,
  PaletteIcon,
  SettingsIcon,
  TargetIcon,
} from "@/components/icons";

export type ProfileMenuItem = {
  key: string;
  label: string;
  icon: ComponentType<IconProps>;
  href?: string;
};

export function soon(label: string) {
  Alert.alert(label, "Появится позже");
}

// Opens the row's route, or the shared placeholder when it has none.
export function activateMenuItem(item: ProfileMenuItem) {
  if (item.href) router.push(item.href as never);
  else soon(item.label);
}

// The Profile page's "Настройки" card, in its original order.
export const SETTINGS_ITEMS: readonly ProfileMenuItem[] = [
  { key: "notifications", label: "Уведомления", icon: BellIcon, href: "/notifications" },
  { key: "goals", label: "Цели", icon: TargetIcon },
  { key: "calendar", label: "Календарь служения", icon: CalendarIcon, href: "/calendar" }, // TASK_083
  { key: "stats", label: "Статистика", icon: ChartIcon, href: "/statistics" }, // TASK_081
  { key: "appearance", label: "Оформление", icon: PaletteIcon, href: "/appearance" }, // TASK_078
  { key: "language", label: "Язык", icon: GlobeIcon },
];

// TASK_073 — the drawer-only row that opens the app's Settings screen
// (ministry mode, hours goal). Deliberately NOT part of SETTINGS_ITEMS: the
// Profile page must not grow a «Настройки» row inside its own «Настройки»
// card — the settings themselves belong to /settings, not to Profile.
export const SETTINGS_SCREEN_ITEM: ProfileMenuItem = { key: "settings", label: "Настройки", icon: SettingsIcon, href: "/settings" };

// The two actionable rows of the page's "О приложении" card (the version
// row is a static value, rendered by each surface from appInfo).
export const ABOUT_ITEMS: readonly ProfileMenuItem[] = [
  { key: "changelog", label: "История изменений", icon: ClockIcon },
  { key: "feedback", label: "Обратная связь", icon: MessageIcon },
];

// How the drawer regroups the same SETTINGS_ITEMS (Finance-style sections
// instead of one long card). Every key must exist above — a test guards it.
export const DRAWER_SERVICE_KEYS = ["goals", "calendar", "stats"] as const;
export const DRAWER_APP_KEYS = ["notifications", "appearance", "language"] as const;

export function pickMenuItems(keys: readonly string[]): ProfileMenuItem[] {
  return keys.map((k) => {
    const item = SETTINGS_ITEMS.find((i) => i.key === k);
    if (!item) throw new Error(`profileMenu: unknown item key "${k}"`);
    return item;
  });
}
