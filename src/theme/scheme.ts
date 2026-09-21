// TASK_078 — the active colour scheme registry and the two primitives every
// token cluster and style sheet are built on. No React here.
//
// Why a registry and not only a context: every screen's colours live in
// module-level token objects (`DS`, `MINISTRY`, `COLORS`, …) that are read
// inside `StyleSheet.create` and straight in JSX. Making each read go
// through a hook would touch every colour in the app; instead the token
// objects are LIVE (`live()` — getters that consult this registry), and the
// style sheets are built lazily per scheme (`useThemedStyles` in
// ThemeProvider.tsx). ThemeProvider writes the resolved scheme here during
// its own render, before any consumer renders, so a read is never stale.
import type { ColorScheme, ThemePreference } from "@/types";

let current: ColorScheme = "light";

export function getScheme(): ColorScheme {
  return current;
}

/** Sets the active scheme. Only ThemeProvider (and tests) should call this. */
export function setScheme(scheme: ColorScheme): void {
  current = scheme;
}

/** `system` follows the device; an unknown device scheme counts as light. */
export function resolveScheme(preference: ThemePreference, system: ColorScheme | null | undefined): ColorScheme {
  if (preference === "light" || preference === "dark") return preference;
  return system === "dark" ? "dark" : "light";
}

/**
 * A token cluster with one value per scheme: `live(LIGHT, DARK)` returns an
 * object whose every property is an enumerable getter for the CURRENT
 * scheme's value. `Object.keys` / `Object.entries` / spread all see the
 * active values, so existing helpers such as `ministryCssVars()` keep
 * working. Both sets must have exactly the same keys — asserted here so a
 * dark token can never be forgotten silently.
 */
export function live<T extends Record<string, unknown>>(light: T, dark: T): T {
  const lk = Object.keys(light);
  const dk = Object.keys(dark);
  const missing = lk.filter((k) => !(k in dark));
  const extra = dk.filter((k) => !(k in light));
  if (missing.length || extra.length) {
    throw new Error(`live(): dark set mismatch — missing [${missing.join(", ")}], extra [${extra.join(", ")}]`);
  }
  const out = {} as T;
  for (const key of lk) {
    Object.defineProperty(out, key, {
      enumerable: true,
      get: () => (current === "dark" ? dark[key] : light[key]),
    });
  }
  return out;
}
