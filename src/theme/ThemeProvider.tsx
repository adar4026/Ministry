// TASK_078 — the app's colour theme, modelled on Lex Finance's
// `state.theme` + `applyTheme()`: the user's preference (light / dark /
// system) lives in MinistrySettings (mj_settings_v1); this provider resolves
// it against the device scheme, publishes the result and keeps the module
// registry (scheme.ts) and, on web, the document (`data-theme`,
// `color-scheme`, `theme-color`) in sync.
//
// Consumers do not remount on a change (that would reset the navigator):
// every component that owns a style sheet subscribes through
// `useThemedStyles`, re-renders, and reads the new scheme's sheet.
import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";
import { Platform, useColorScheme } from "react-native";
import { nextThemePreference } from "@/data/ministryMode";
import { useStore } from "@/store/StoreContext";
import type { ColorScheme, ThemePreference } from "@/types";
import { getScheme, resolveScheme, setScheme } from "./scheme";

export type Theme = {
  /** What is painted right now. */
  scheme: ColorScheme;
  /** What the user chose ("system" follows the device). */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** Finance's toggleTheme(): light → dark → system → light. */
  cycle: () => void;
};

// `null` outside a provider: `useTheme()` then answers from the registry, so
// a component rendered bare (unit tests, storybook-style harnesses) still
// follows `setScheme()`.
const ThemeContext = createContext<Theme | null>(null);
const noop = () => {};

// Finance's <meta name="theme-color"> per scheme; Ministry's own grounds.
export const THEME_COLOR: Record<ColorScheme, string> = { light: "#f8fafc", dark: "#0f1115" };

/** Web only: the same document-level switch as Finance's applyTheme(). */
export function applyDocumentScheme(scheme: ColorScheme): void {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const root = document.documentElement;
  // jest-expo mocks Platform.OS="web" without a DOM in some suites.
  if (!root || !document.body) return;
  root.setAttribute("data-theme", scheme);
  root.style.colorScheme = scheme;
  document.body.style.backgroundColor = THEME_COLOR[scheme];
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = THEME_COLOR[scheme];
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings, setThemePreference } = useStore();
  const system = useColorScheme();
  const preference = settings.theme;
  const scheme = resolveScheme(preference, system);
  const appliedRef = useRef<ColorScheme | null>(null);

  // Written during render on purpose: consumers below read the registry
  // while THEY render, and this provider always renders first. The document
  // attribute goes the same way (idempotent), so a child's effect that
  // reads CSS variables (HeroCanvas) already sees the new scheme — child
  // effects run before a parent's, so an effect here would be too late.
  if (getScheme() !== scheme) setScheme(scheme);
  if (appliedRef.current !== scheme) {
    appliedRef.current = scheme;
    applyDocumentScheme(scheme);
  }

  const cycle = useCallback(() => setThemePreference(nextThemePreference(preference)), [preference, setThemePreference]);
  const value = useMemo<Theme>(
    () => ({ scheme, preference, setPreference: setThemePreference, cycle }),
    [scheme, preference, setThemePreference, cycle],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  return ctx ?? { scheme: getScheme(), preference: "system", setPreference: noop, cycle: noop };
}

// One sheet per (factory, scheme), built on first use. `StyleSheet.create`
// is cheap but not free, and identity-stable sheets keep memoised children
// from re-rendering for nothing.
// `T` is usually a StyleSheet, but any per-scheme derived object qualifies
// (heroFigure's glass layer styles, for one).
const sheetCache = new WeakMap<() => object, Partial<Record<ColorScheme, object>>>();

/**
 * `const styles = useThemedStyles(makeStyles)` — `makeStyles` is the old
 * module-level `StyleSheet.create({...})` wrapped in `() =>`. It runs with
 * the live tokens already switched to the current scheme.
 */
export function useThemedStyles<T extends object>(make: () => T): T {
  const { scheme } = useTheme();
  let byScheme = sheetCache.get(make);
  if (!byScheme) {
    byScheme = {};
    sheetCache.set(make, byScheme);
  }
  let sheet = byScheme[scheme];
  if (!sheet) {
    // The registry already holds `scheme` (set by the provider's render);
    // guard anyway for a sheet requested outside a provider.
    const prev = getScheme();
    if (prev !== scheme) setScheme(scheme);
    sheet = make();
    if (prev !== scheme) setScheme(prev);
    byScheme[scheme] = sheet;
  }
  return sheet as T;
}
